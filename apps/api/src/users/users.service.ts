import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  ManagedUser,
  RolesResponse,
  TemporaryPasswordIssued,
  UserCreated,
  UserUpdated,
  UsersResponse,
} from '@geedyx/contracts';
import { hashPassword } from '../auth/password';
import { createTemporaryPassword } from '../auth/auth.utils';
import { PrismaService } from '../prisma/prisma.service';
import { paginationMeta, PaginationDto } from '../http/pagination.dto';
import type { CreateUserDto } from './dto/create-user.dto';
import type { IssueTemporaryPasswordDto } from './dto/issue-temporary-password.dto';
import type { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import type { UpdateUserStatusDto } from './dto/update-user-status.dto';

const TEMPORARY_PASSWORD_DURATION_MS = 24 * 60 * 60 * 1000;

const USER_LIST_INCLUDE = {
  roles: {
    include: {
      role: {
        select: {
          code: true,
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

type UserWithRoles = Prisma.UserGetPayload<{
  include: typeof USER_LIST_INCLUDE;
}>;

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
                temporaryPasswordExpiresAt: temporaryPasswordExpiresAt.toISOString(),
              },
            },
          });

          return {
            user: this.toManagedUser(user),
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
    if (actor.id === target.id && dto.status !== 'ACTIVE') {
      throw new ConflictException({
        code: 'SELF_STATUS_CHANGE_NOT_ALLOWED',
        detail: 'No puedes desactivar o bloquear tu propia cuenta.',
      });
    }
    await this.assertOwnerCanChangeStatus(target, dto.status);

    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: target.id },
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
          where: { userId: target.id, revokedAt: null },
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
          entityId: target.id,
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
    await this.ensureSystemRoles(actor.companyId);
    const requestedCodes = [
      ...new Set(dto.roleCodes.map((code) => code.trim().toUpperCase())),
    ];
    const roles = await this.prisma.role.findMany({
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

    const actorRoleCodes = await this.roleCodesFor(actor.id);
    const currentRoleCodes = await this.roleCodesFor(target.id);
    const ownerChanging =
      currentRoleCodes.includes('OWNER') !== requestedCodes.includes('OWNER');
    if (ownerChanging && !actorRoleCodes.includes('OWNER')) {
      throw new ForbiddenException({
        code: 'OWNER_ROLE_REQUIRES_OWNER',
        detail: 'Solo un Owner puede administrar el rol Owner.',
      });
    }
    if (ownerChanging) {
      await this.assertOwnerRoleInvariant(target.id, requestedCodes);
    }

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: target.id } });
      if (roles.length > 0) {
        await tx.userRole.createMany({
          data: roles.map((role) => ({ userId: target.id, roleId: role.id })),
        });
      }
      const updated = await tx.user.findUniqueOrThrow({
        where: { id: target.id },
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
          entityId: target.id,
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
    await this.ensureSystemRoles(companyId);
    const roles = await this.prisma.role.findMany({
      where: { companyId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
    return {
      roles: roles.map((role) => ({
        id: role.id,
        code: role.code,
        name: role.name,
        isSystem: role.isSystem,
        permissions: role.permissions.map(({ permission }) => permission.code).sort(),
      })),
    };
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
    const temporaryPassword = createTemporaryPassword();
    const passwordExpiresAt = new Date(Date.now() + TEMPORARY_PASSWORD_DURATION_MS);
    const passwordHash = await hashPassword(temporaryPassword);
    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: target.id },
        data: {
          passwordHash,
          passwordChangeRequired: true,
          passwordExpiresAt,
        },
        include: USER_LIST_INCLUDE,
      });
      await tx.session.updateMany({
        where: { userId: target.id, revokedAt: null },
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
          entityId: target.id,
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

  private async ensureSystemRoles(companyId: string): Promise<void> {
    const permissions = await this.prisma.permission.findMany({
      select: { code: true, id: true },
    });
    const permissionIds = new Map(
      permissions.map((permission) => [permission.code, permission.id]),
    );
    const definitions = [
      {
        code: 'OWNER',
        name: 'Owner',
        permissionCodes: permissions.map((permission) => permission.code),
      },
      {
        code: 'ADMIN',
        name: 'Admin',
        permissionCodes: permissions
          .map((permission) => permission.code)
          .filter((code) => code !== 'system_health.read'),
      },
      {
        code: 'USER',
        name: 'Usuario',
        permissionCodes: [
          'dashboard.read',
          'products.read',
          'inventory.read',
          'customers.read',
          'suppliers.read',
          'sales.read',
          'payments.read',
          'reports.read',
        ],
      },
    ];
    await this.prisma.$transaction(async (tx) => {
      for (const definition of definitions) {
        const role = await tx.role.upsert({
          where: {
            companyId_code: {
              companyId,
              code: definition.code,
            },
          },
          update: {
            name: definition.name,
            isSystem: true,
          },
          create: {
            companyId,
            code: definition.code,
            name: definition.name,
            isSystem: true,
          },
        });
        const rolePermissions = definition.permissionCodes.flatMap((code) => {
          const permissionId = permissionIds.get(code);
          return permissionId ? [{ roleId: role.id, permissionId }] : [];
        });
        if (rolePermissions.length > 0) {
          await tx.rolePermission.createMany({
            data: rolePermissions,
            skipDuplicates: true,
          });
        }
      }
    });
  }

  private async roleCodesFor(userId: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      select: { role: { select: { code: true } } },
    });
    return rows.map(({ role }) => role.code);
  }

  private async assertOwnerCanChangeStatus(
    target: UserWithRoles,
    nextStatus: UpdateUserStatusDto['status'],
  ): Promise<void> {
    if (
      nextStatus === 'ACTIVE' ||
      !target.roles.some(({ role }) => role.code === 'OWNER')
    ) {
      return;
    }
    const activeOwners = await this.prisma.user.count({
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
    targetUserId: string,
    requestedCodes: string[],
  ): Promise<void> {
    if (requestedCodes.includes('OWNER')) return;
    const target = await this.prisma.user.findUniqueOrThrow({
      where: { id: targetUserId },
      select: { companyId: true, status: true },
    });
    const activeOwners = await this.prisma.user.count({
      where: {
        companyId: target.companyId,
        status: 'ACTIVE',
        roles: { some: { role: { code: 'OWNER' } } },
        id: { not: targetUserId },
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
      createdAt: user.createdAt.toISOString(),
    };
  }
}
