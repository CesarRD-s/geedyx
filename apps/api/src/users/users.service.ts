import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type {
  ManagedUser,
  RoleSummary,
  RolesResponse,
  TemporaryPasswordIssued,
  UserCreated,
  UserUpdated,
  UsersResponse,
} from '@geedyx/contracts';
import { PERMISSION_CATALOG } from '@geedyx/contracts';
import { hashPassword, verifyPassword } from '../auth/password';
import { createTemporaryPassword } from '../auth/auth.utils';
import { PrismaService } from '../prisma/prisma.service';
import { paginationMeta, PaginationDto } from '../http/pagination.dto';
import type { CreateUserDto } from './dto/create-user.dto';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { IssueTemporaryPasswordDto } from './dto/issue-temporary-password.dto';
import type { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import type { UpdateUserStatusDto } from './dto/update-user-status.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';

const TEMPORARY_PASSWORD_DURATION_MS = 24 * 60 * 60 * 1000;
const SERIALIZATION_RETRY_LIMIT = 3;

const USER_LIST_INCLUDE = {
  roles: {
    include: {
      role: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

const ROLE_MANAGEMENT_INCLUDE = {
  permissions: {
    include: {
      permission: {
        select: {
          code: true,
        },
      },
    },
  },
  _count: {
    select: {
      users: true,
    },
  },
} satisfies Prisma.RoleInclude;

type UserWithRoles = Prisma.UserGetPayload<{
  include: typeof USER_LIST_INCLUDE;
}>;

type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: typeof ROLE_MANAGEMENT_INCLUDE;
}>;

const visiblePermissionDefinitions = PERMISSION_CATALOG.filter(
  (permission) => permission.visible && permission.available,
);
const visiblePermissionCodes = new Set<string>(
  visiblePermissionDefinitions.map((permission) => permission.code),
);
const assignablePermissionCodes = new Set<string>(
  visiblePermissionDefinitions
    .filter((permission) => permission.assignable)
    .map((permission) => permission.code),
);

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(
    actorUserId: string,
    dto: PaginationDto = new PaginationDto(),
  ): Promise<UsersResponse> {
    const actor = await this.prisma.user.findUniqueOrThrow({
      where: { id: actorUserId },
      select: { companyId: true },
    });
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: { companyId: actor.companyId },
        include: USER_LIST_INCLUDE,
        orderBy: [{ displayName: 'asc' }, { email: 'asc' }],
        skip: dto.skip,
        take: dto.take,
      }),
      this.prisma.user.count({ where: { companyId: actor.companyId } }),
    ]);

    return {
      users: users.map((user) => this.toManagedUser(user)),
      pagination: paginationMeta(dto.page, dto.pageSize, total),
    };
  }

  async createUser(
    dto: CreateUserDto,
    actorUserId: string,
    requestId: string | undefined,
  ): Promise<UserCreated> {
    const displayName = dto.displayName.trim();
    const email = dto.email.trim().toLowerCase();
    const requestedCodes = this.normalizeRoleCodes(dto.roleCodes);
    const ownerSensitive = requestedCodes.includes('OWNER');
    if (ownerSensitive && (dto.reason?.trim().length ?? 0) < 3) {
      throw new BadRequestException({
        code: 'OWNER_ACTION_REASON_REQUIRED',
        detail: 'Escribe el motivo para asignar la titularidad de la empresa.',
      });
    }
    const ownerReauthenticated = ownerSensitive
      ? await this.assertOwnerReauthentication(actorUserId, dto.currentPassword)
      : false;
    const temporaryPassword = createTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const temporaryPasswordExpiresAt = new Date(
      Date.now() + TEMPORARY_PASSWORD_DURATION_MS,
    );

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const actor = await tx.user.findUniqueOrThrow({
            where: { id: actorUserId },
            select: { companyId: true },
          });
          await this.assertActorCanManageRoles(tx, actorUserId);
          const roles = await tx.role.findMany({
            where: {
              companyId: actor.companyId,
              code: { in: requestedCodes },
            },
          });
          if (roles.length !== requestedCodes.length) {
            throw new NotFoundException({
              code: 'ROLE_NOT_FOUND',
              detail: 'Uno de los perfiles seleccionados ya no está disponible.',
            });
          }
          if (ownerSensitive) {
            if (!ownerReauthenticated) {
              await this.assertOwnerReauthentication(actorUserId, dto.currentPassword);
            }
            await this.assertActorIsOwner(tx, actorUserId);
          }
          const user = await tx.user.create({
            data: {
              companyId: actor.companyId,
              displayName,
              email,
              passwordHash,
              passwordChangeRequired: true,
              passwordExpiresAt: temporaryPasswordExpiresAt,
            },
            include: USER_LIST_INCLUDE,
          });
          await tx.userRole.createMany({
            data: roles.map((role) => ({
              userId: user.id,
              roleId: role.id,
            })),
          });
          const createdUser = await tx.user.findUniqueOrThrow({
            where: { id: user.id },
            include: USER_LIST_INCLUDE,
          });
          await tx.auditEvent.create({
            data: {
              companyId: actor.companyId,
              actorUserId,
              module: 'users',
              action: 'USER_CREATED',
              outcome: 'SUCCESS',
              entityType: 'User',
              entityId: user.id,
              requestId,
              metadata: {
                roles: requestedCodes,
                temporaryPasswordExpiresAt: temporaryPasswordExpiresAt.toISOString(),
                ...(ownerSensitive ? { reason: dto.reason?.trim() } : {}),
              },
            },
          });

          return {
            user: this.toManagedUser(createdUser),
            temporaryPassword,
            temporaryPasswordExpiresAt: temporaryPasswordExpiresAt.toISOString(),
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'USER_EMAIL_ALREADY_EXISTS',
          detail: 'El correo ya está registrado.',
        });
      }
      throw error;
    }
  }

  async updateStatus(
    actorUserId: string,
    targetUserId: string,
    dto: UpdateUserStatusDto,
    requestId: string | undefined,
  ): Promise<UserUpdated> {
    const { actor, target } = await this.getActorAndTarget(actorUserId, targetUserId);
    const targetIsOwner = target.roles.some(({ role }) => role.code === 'OWNER');
    const ownerReauthenticated = targetIsOwner
      ? await this.assertOwnerReauthentication(actorUserId, dto.currentPassword)
      : false;
    if (actor.id === target.id && dto.status !== 'ACTIVE') {
      throw new ConflictException({
        code: 'SELF_STATUS_CHANGE_NOT_ALLOWED',
        detail: 'No puedes desactivar o bloquear tu propia cuenta.',
      });
    }
    const user = await this.withSerializableRetry(async (tx) => {
      const currentTarget = await tx.user.findFirst({
        where: {
          id: target.id,
          companyId: actor.companyId,
        },
        include: USER_LIST_INCLUDE,
      });
      if (!currentTarget) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          detail: 'El usuario no existe en esta empresa.',
        });
      }

      const currentTargetIsOwner = currentTarget.roles.some(
        ({ role }) => role.code === 'OWNER',
      );
      if (currentTargetIsOwner) {
        if (!ownerReauthenticated) {
          await this.assertOwnerReauthentication(actorUserId, dto.currentPassword);
        }
        await this.assertActorIsOwner(tx, actorUserId);
      }
      if (actor.id === currentTarget.id && dto.status !== 'ACTIVE') {
        throw new ConflictException({
          code: 'SELF_STATUS_CHANGE_NOT_ALLOWED',
          detail: 'No puedes desactivar o bloquear tu propia cuenta.',
        });
      }
      await this.assertOwnerCanChangeStatus(tx, currentTarget, dto.status);

      const updated = await tx.user.update({
        where: { id: currentTarget.id },
        data: {
          status: dto.status,
          ...(dto.status === 'ACTIVE'
            ? {
                failedLoginAttempts: 0,
                lockedUntil: null,
                lockReason: null,
              }
            : {
                lockedUntil: null,
                lockReason: dto.status === 'LOCKED' ? 'ADMINISTRATIVE' : null,
              }),
        },
        include: USER_LIST_INCLUDE,
      });
      if (dto.status !== 'ACTIVE') {
        await tx.session.updateMany({
          where: { userId: currentTarget.id, revokedAt: null },
          data: {
            revokedAt: new Date(),
            revokedReason: `USER_${dto.status}`,
          },
        });
      }
      await tx.auditEvent.create({
        data: {
          companyId: actor.companyId,
          actorUserId,
          module: 'users',
          action: `USER_${dto.status}`,
          outcome: 'SUCCESS',
          entityType: 'User',
          entityId: currentTarget.id,
          requestId,
          metadata: { reason: dto.reason },
        },
      });
      return updated;
    });
    return { user: this.toManagedUser(user) };
  }

  async updateRoles(
    actorUserId: string,
    targetUserId: string,
    dto: UpdateUserRolesDto,
    requestId: string | undefined,
  ): Promise<UserUpdated> {
    const { actor, target } = await this.getActorAndTarget(actorUserId, targetUserId);
    const requestedCodes = [
      ...new Set(dto.roleCodes.map((code) => code.trim().toUpperCase())),
    ];
    const initiallyOwnerSensitive =
      target.roles.some(({ role }) => role.code === 'OWNER') ||
      requestedCodes.includes('OWNER');
    const ownerReauthenticated = initiallyOwnerSensitive
      ? await this.assertOwnerReauthentication(actorUserId, dto.currentPassword)
      : false;

    const user = await this.withSerializableRetry(async (tx) => {
      const currentTarget = await tx.user.findFirst({
        where: {
          id: target.id,
          companyId: actor.companyId,
        },
        include: USER_LIST_INCLUDE,
      });
      if (!currentTarget) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          detail: 'El usuario no existe en esta empresa.',
        });
      }

      const currentRoleCodes = currentTarget.roles.map(({ role }) => role.code);
      const ownerSensitive =
        currentRoleCodes.includes('OWNER') || requestedCodes.includes('OWNER');
      if (ownerSensitive) {
        if (!ownerReauthenticated) {
          await this.assertOwnerReauthentication(actorUserId, dto.currentPassword);
        }
        await this.assertActorIsOwner(tx, actorUserId);
      }
      if (requestedCodes.includes('OWNER') && currentTarget.status !== 'ACTIVE') {
        throw new ConflictException({
          code: 'OWNER_MUST_BE_ACTIVE',
          detail: 'Solo se puede asignar el rol Owner a una cuenta activa.',
        });
      }

      const roles = await tx.role.findMany({
        where: {
          companyId: actor.companyId,
          code: { in: requestedCodes },
        },
      });
      if (roles.length !== requestedCodes.length) {
        throw new NotFoundException({
          code: 'ROLE_NOT_FOUND',
          detail: 'Uno de los roles seleccionados no existe.',
        });
      }
      if (currentRoleCodes.includes('OWNER') && !requestedCodes.includes('OWNER')) {
        await this.assertOwnerRoleInvariant(tx, currentTarget);
      }

      await tx.userRole.deleteMany({ where: { userId: currentTarget.id } });
      if (roles.length > 0) {
        await tx.userRole.createMany({
          data: roles.map((role) => ({
            userId: currentTarget.id,
            roleId: role.id,
          })),
        });
      }
      const updated = await tx.user.findUniqueOrThrow({
        where: { id: currentTarget.id },
        include: USER_LIST_INCLUDE,
      });
      await tx.auditEvent.create({
        data: {
          companyId: actor.companyId,
          actorUserId,
          module: 'users',
          action: 'USER_ROLES_UPDATED',
          outcome: 'SUCCESS',
          entityType: 'User',
          entityId: currentTarget.id,
          requestId,
          metadata: {
            reason: dto.reason,
            roles: requestedCodes,
          },
        },
      });
      return updated;
    });
    return { user: this.toManagedUser(user) };
  }

  async listRoles(actorUserId: string): Promise<RolesResponse> {
    const companyId = await this.companyIdFor(actorUserId);
    const roles = await this.prisma.role.findMany({
      where: { companyId },
      include: ROLE_MANAGEMENT_INCLUDE,
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
    return {
      roles: roles.map((role) => this.toRoleSummary(role)),
      permissions: visiblePermissionDefinitions.map((permission) => ({
        code: permission.code,
        moduleKey: permission.moduleKey,
        moduleLabel: permission.moduleLabel,
        label: permission.label,
        description: permission.description,
        assignable: permission.assignable,
      })),
    };
  }

  async createRole(
    actorUserId: string,
    dto: CreateRoleDto,
    requestId: string | undefined,
  ): Promise<RoleSummary> {
    const companyId = await this.companyIdFor(actorUserId);
    const name = dto.name.trim();
    const description = dto.description.trim();
    const permissionCodes = this.normalizePermissionCodes(dto.permissionCodes);
    this.assertAssignablePermissions(permissionCodes);
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
      select: { id: true, code: true },
    });
    if (permissions.length !== permissionCodes.length) {
      throw new BadRequestException({
        code: 'PERMISSION_NOT_AVAILABLE',
        detail: 'Uno de los accesos seleccionados ya no está disponible.',
      });
    }

    try {
      return await this.withSerializableRetry(async (tx) => {
        await this.assertRoleNameAvailable(tx, companyId, name);
        const role = await tx.role.create({
          data: {
            companyId,
            code: `CUSTOM_${randomUUID().toUpperCase()}`,
            name,
            description,
            isSystem: false,
          },
        });
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: role.id,
            permissionId: permission.id,
          })),
        });
        await tx.auditEvent.create({
          data: {
            companyId,
            actorUserId,
            module: 'users',
            action: 'ROLE_CREATED',
            outcome: 'SUCCESS',
            entityType: 'Role',
            entityId: role.id,
            requestId,
            metadata: {
              name,
              permissionCodes,
            },
          },
        });
        const createdRole = await tx.role.findUniqueOrThrow({
          where: { id: role.id },
          include: ROLE_MANAGEMENT_INCLUDE,
        });
        return this.toRoleSummary(createdRole);
      });
    } catch (error) {
      this.rethrowRoleNameConflict(error);
      throw error;
    }
  }

  async updateRole(
    actorUserId: string,
    roleId: string,
    dto: UpdateRoleDto,
    requestId: string | undefined,
  ): Promise<RoleSummary> {
    const companyId = await this.companyIdFor(actorUserId);
    const name = dto.name.trim();
    const description = dto.description.trim();
    const permissionCodes = this.normalizePermissionCodes(dto.permissionCodes);
    this.assertAssignablePermissions(permissionCodes);
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
      select: { id: true, code: true },
    });
    if (permissions.length !== permissionCodes.length) {
      throw new BadRequestException({
        code: 'PERMISSION_NOT_AVAILABLE',
        detail: 'Uno de los accesos seleccionados ya no está disponible.',
      });
    }

    try {
      return await this.withSerializableRetry(async (tx) => {
        const role = await tx.role.findFirst({
          where: {
            id: roleId,
            companyId,
          },
        });
        if (!role) {
          throw new NotFoundException({
            code: 'ROLE_NOT_FOUND',
            detail: 'El perfil de acceso ya no está disponible.',
          });
        }
        if (role.isSystem) {
          throw new ConflictException({
            code: 'SYSTEM_ROLE_IMMUTABLE',
            detail: 'Los perfiles base no se pueden modificar.',
          });
        }
        await this.assertRoleNameAvailable(tx, companyId, name, roleId);
        await tx.role.update({
          where: { id: role.id },
          data: { name, description },
        });
        await tx.rolePermission.deleteMany({ where: { roleId } });
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId,
            permissionId: permission.id,
          })),
        });
        await tx.auditEvent.create({
          data: {
            companyId,
            actorUserId,
            module: 'users',
            action: 'ROLE_UPDATED',
            outcome: 'SUCCESS',
            entityType: 'Role',
            entityId: roleId,
            requestId,
            metadata: {
              name,
              permissionCodes,
            },
          },
        });
        const updatedRole = await tx.role.findUniqueOrThrow({
          where: { id: roleId },
          include: ROLE_MANAGEMENT_INCLUDE,
        });
        return this.toRoleSummary(updatedRole);
      });
    } catch (error) {
      this.rethrowRoleNameConflict(error);
      throw error;
    }
  }

  async deleteRole(
    actorUserId: string,
    roleId: string,
    requestId: string | undefined,
  ): Promise<{ deleted: true }> {
    const companyId = await this.companyIdFor(actorUserId);
    await this.withSerializableRetry(async (tx) => {
      const role = await tx.role.findFirst({
        where: {
          id: roleId,
          companyId,
        },
        include: {
          _count: {
            select: { users: true },
          },
        },
      });
      if (!role) {
        throw new NotFoundException({
          code: 'ROLE_NOT_FOUND',
          detail: 'El perfil de acceso ya no está disponible.',
        });
      }
      if (role.isSystem) {
        throw new ConflictException({
          code: 'SYSTEM_ROLE_IMMUTABLE',
          detail: 'Los perfiles base no se pueden eliminar.',
        });
      }
      if (role._count.users > 0) {
        throw new ConflictException({
          code: 'ROLE_IN_USE',
          detail: 'Quita este perfil de las cuentas antes de eliminarlo.',
        });
      }
      await tx.auditEvent.create({
        data: {
          companyId,
          actorUserId,
          module: 'users',
          action: 'ROLE_DELETED',
          outcome: 'SUCCESS',
          entityType: 'Role',
          entityId: role.id,
          requestId,
          metadata: { name: role.name },
        },
      });
      await tx.role.delete({ where: { id: role.id } });
    });
    return { deleted: true };
  }

  async issueTemporaryPassword(
    actorUserId: string,
    targetUserId: string,
    dto: IssueTemporaryPasswordDto,
    requestId: string | undefined,
  ): Promise<TemporaryPasswordIssued> {
    const { actor, target } = await this.getActorAndTarget(actorUserId, targetUserId);
    if (actor.id === target.id) {
      throw new ConflictException({
        code: 'SELF_TEMPORARY_PASSWORD_NOT_ALLOWED',
        detail: 'Utiliza el cambio normal de contraseña para tu cuenta.',
      });
    }
    const targetIsOwner = target.roles.some(({ role }) => role.code === 'OWNER');
    const ownerReauthenticated = targetIsOwner
      ? await this.assertOwnerReauthentication(actorUserId, dto.currentPassword)
      : false;
    const temporaryPassword = createTemporaryPassword();
    const passwordExpiresAt = new Date(Date.now() + TEMPORARY_PASSWORD_DURATION_MS);
    const passwordHash = await hashPassword(temporaryPassword);
    const user = await this.withSerializableRetry(async (tx) => {
      const currentTarget = await tx.user.findFirst({
        where: {
          id: target.id,
          companyId: actor.companyId,
        },
        include: USER_LIST_INCLUDE,
      });
      if (!currentTarget) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          detail: 'El usuario no existe en esta empresa.',
        });
      }
      const currentTargetIsOwner = currentTarget.roles.some(
        ({ role }) => role.code === 'OWNER',
      );
      if (currentTargetIsOwner) {
        if (!ownerReauthenticated) {
          await this.assertOwnerReauthentication(actorUserId, dto.currentPassword);
        }
        await this.assertActorIsOwner(tx, actorUserId);
      }
      const updated = await tx.user.update({
        where: { id: currentTarget.id },
        data: {
          passwordHash,
          passwordChangeRequired: true,
          passwordExpiresAt,
        },
        include: USER_LIST_INCLUDE,
      });
      await tx.session.updateMany({
        where: { userId: currentTarget.id, revokedAt: null },
        data: {
          revokedAt: new Date(),
          revokedReason: 'TEMPORARY_PASSWORD_ISSUED',
        },
      });
      await tx.auditEvent.create({
        data: {
          companyId: actor.companyId,
          actorUserId,
          module: 'users',
          action: 'TEMPORARY_PASSWORD_ISSUED',
          outcome: 'SUCCESS',
          entityType: 'User',
          entityId: currentTarget.id,
          requestId,
          metadata: {
            reason: dto.reason,
            passwordExpiresAt: passwordExpiresAt.toISOString(),
          },
        },
      });
      return updated;
    });
    return {
      user: this.toManagedUser(user),
      temporaryPassword,
      temporaryPasswordExpiresAt: passwordExpiresAt.toISOString(),
    };
  }

  private async getActorAndTarget(actorUserId: string, targetUserId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true, companyId: true },
    });
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, companyId: actor?.companyId },
      include: USER_LIST_INCLUDE,
    });
    if (!actor || !target) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        detail: 'El usuario no existe en esta empresa.',
      });
    }
    return { actor, target };
  }

  private async companyIdFor(actorUserId: string): Promise<string> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { companyId: true },
    });
    if (!actor) {
      throw new NotFoundException({
        code: 'ACTOR_NOT_FOUND',
        detail: 'No se encontró el usuario de la sesión.',
      });
    }
    return actor.companyId;
  }

  private normalizeRoleCodes(roleCodes: string[]): string[] {
    return [...new Set(roleCodes.map((code) => code.trim().toUpperCase()))];
  }

  private normalizePermissionCodes(permissionCodes: string[]): string[] {
    return [...new Set(permissionCodes.map((code) => code.trim().toLowerCase()))];
  }

  private assertAssignablePermissions(permissionCodes: string[]): void {
    const unavailableCodes = permissionCodes.filter(
      (code) => !assignablePermissionCodes.has(code),
    );
    if (permissionCodes.length === 0 || unavailableCodes.length > 0) {
      throw new BadRequestException({
        code: 'PERMISSION_NOT_AVAILABLE',
        detail: 'Elige al menos un acceso disponible para el perfil.',
      });
    }
  }

  private async assertRoleNameAvailable(
    tx: Prisma.TransactionClient,
    companyId: string,
    name: string,
    excludedRoleId?: string,
  ): Promise<void> {
    const existingRole = await tx.role.findFirst({
      where: {
        companyId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
        ...(excludedRoleId ? { id: { not: excludedRoleId } } : {}),
      },
      select: { id: true },
    });
    if (existingRole) {
      throw new ConflictException({
        code: 'ROLE_NAME_ALREADY_EXISTS',
        detail: 'Ya existe un perfil con ese nombre.',
      });
    }
  }

  private rethrowRoleNameConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(',')
        : String(error.meta?.target ?? '');
      if (target.includes('name') || target.includes('Role_companyId_name_key')) {
        throw new ConflictException({
          code: 'ROLE_NAME_ALREADY_EXISTS',
          detail: 'Ya existe un perfil con ese nombre.',
        });
      }
    }
  }

  private toRoleSummary(role: RoleWithPermissions): RoleSummary {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions
        .map(({ permission }) => permission.code)
        .filter((code) => visiblePermissionCodes.has(code))
        .sort(),
      memberCount: role._count.users,
    };
  }

  private async assertOwnerReauthentication(
    actorUserId: string,
    currentPassword: string | undefined,
  ): Promise<boolean> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: {
        passwordHash: true,
        roles: {
          select: {
            role: {
              select: { code: true },
            },
          },
        },
      },
    });
    const actorIsOwner = actor?.roles.some(({ role }) => role.code === 'OWNER');
    if (!actor || !actorIsOwner) {
      throw new ForbiddenException({
        code: 'OWNER_ROLE_REQUIRES_OWNER',
        detail: 'Solo un Owner puede realizar esta operación.',
      });
    }
    if (!currentPassword) {
      throw new BadRequestException({
        code: 'REAUTHENTICATION_REQUIRED',
        detail: 'Confirma tu contraseña actual para continuar.',
      });
    }
    if (!(await verifyPassword(actor.passwordHash, currentPassword))) {
      throw new UnauthorizedException({
        code: 'REAUTHENTICATION_FAILED',
        detail: 'La contraseña actual no es válida.',
      });
    }
    return true;
  }

  private async assertActorIsOwner(
    tx: Prisma.TransactionClient,
    actorUserId: string,
  ): Promise<void> {
    const ownerRole = await tx.userRole.findFirst({
      where: {
        userId: actorUserId,
        role: { code: 'OWNER' },
      },
      select: { userId: true },
    });
    if (!ownerRole) {
      throw new ForbiddenException({
        code: 'OWNER_ROLE_REQUIRES_OWNER',
        detail: 'Solo un Owner puede realizar esta operación.',
      });
    }
  }

  private async assertActorCanManageRoles(
    tx: Prisma.TransactionClient,
    actorUserId: string,
  ): Promise<void> {
    const roleManager = await tx.userRole.findFirst({
      where: {
        userId: actorUserId,
        role: {
          is: {
            permissions: {
              some: {
                permission: {
                  is: { code: 'roles.manage' },
                },
              },
            },
          },
        },
      },
      select: { userId: true },
    });
    if (!roleManager) {
      throw new ForbiddenException({
        code: 'ROLE_MANAGEMENT_REQUIRED',
        detail: 'No puedes asignar perfiles de acceso.',
      });
    }
  }

  private async withSerializableRetry<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; attempt < SERIALIZATION_RETRY_LIMIT; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        const isSerializationFailure =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034';
        if (!isSerializationFailure) {
          throw error;
        }
        if (attempt < SERIALIZATION_RETRY_LIMIT - 1) {
          continue;
        }
        throw new ConflictException({
          code: 'CONCURRENT_USER_UPDATE',
          detail: 'La cuenta cambió en otra operación. Inténtalo de nuevo.',
        });
      }
    }
    throw new ConflictException({
      code: 'CONCURRENT_USER_UPDATE',
      detail: 'La cuenta cambió en otra operación. Inténtalo de nuevo.',
    });
  }

  private async assertOwnerCanChangeStatus(
    tx: Prisma.TransactionClient,
    target: UserWithRoles,
    nextStatus: UpdateUserStatusDto['status'],
  ): Promise<void> {
    if (
      nextStatus === 'ACTIVE' ||
      !target.roles.some(({ role }) => role.code === 'OWNER')
    ) {
      return;
    }
    const activeOwners = await tx.user.count({
      where: {
        companyId: target.companyId,
        status: 'ACTIVE',
        roles: { some: { role: { code: 'OWNER' } } },
      },
    });
    if (activeOwners <= 1) {
      throw new ConflictException({
        code: 'LAST_OWNER_PROTECTED',
        detail: 'Debe existir al menos un Owner activo.',
      });
    }
  }

  private async assertOwnerRoleInvariant(
    tx: Prisma.TransactionClient,
    target: UserWithRoles,
  ): Promise<void> {
    if (target.status !== 'ACTIVE') return;
    const activeOwners = await tx.user.count({
      where: {
        companyId: target.companyId,
        status: 'ACTIVE',
        roles: { some: { role: { code: 'OWNER' } } },
        id: { not: target.id },
      },
    });
    if (target.status === 'ACTIVE' && activeOwners === 0) {
      throw new ConflictException({
        code: 'LAST_OWNER_PROTECTED',
        detail: 'Debe existir al menos un Owner activo.',
      });
    }
  }

  private toManagedUser(user: UserWithRoles): ManagedUser {
    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      status: user.status,
      passwordChangeRequired: user.passwordChangeRequired,
      roles: user.roles.map(({ role }) => role.code),
      roleNames: user.roles.map(({ role }) => role.name),
      createdAt: user.createdAt.toISOString(),
    };
  }
}
