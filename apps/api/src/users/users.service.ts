import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AuditAction,
  AuditActor,
  AuditResult,
  AuditService,
  type AuditRequestContext,
} from '../audit/audit.service.js';
import { SystemRoleCode } from '../auth/authorization/permissions.js';
import { durationToMs } from '../auth/duration.js';
import { EmailDeliveryService } from '../notifications/email-delivery.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { ListUsersDto } from './dto/list-users.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

const USER_SELECT = {
  id: true,
  username: true,
  email: true,
  displayName: true,
  locale: true,
  timeZone: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  roles: {
    select: {
      role: { select: { id: true, code: true, name: true, isSystem: true } },
    },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly emailDelivery: EmailDeliveryService,
  ) {}

  async findAll(companyId: string, query: ListUsersDto) {
    const where = {
      companyId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              {
                username: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                email: { contains: query.search, mode: 'insensitive' as const },
              },
              {
                displayName: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: [{ status: 'asc' }, { username: 'asc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map((user) => this.toUserResponse(user)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  async findOne(companyId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      select: USER_SELECT,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toUserResponse(user);
  }

  async listAssignableRoles(companyId: string) {
    const roles = await this.prisma.role.findMany({
      where: { companyId, code: { not: SystemRoleCode.Owner } },
      select: { id: true, code: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
    return roles;
  }

  async create(
    companyId: string,
    actorUserId: string,
    dto: CreateUserDto,
    auditContext: AuditRequestContext,
  ) {
    const roleIds = await this.validateAssignableRoles(companyId, dto.roleIds);
    const token = randomBytes(32).toString('base64url');
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() +
        durationToMs(this.config.get<string>('INVITATION_TTL', '7d')),
    );

    try {
      const invitation = await this.prisma.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: {
            companyId,
            username: dto.username,
            email: dto.email,
            status: 'INVITED',
            displayName: dto.displayName || null,
            roles: { create: roleIds.map((roleId) => ({ roleId })) },
          },
          select: USER_SELECT,
        });
        await transaction.userInvitation.create({
          data: {
            userId: user.id,
            tokenHash: this.hashToken(token),
            expiresAt,
          },
        });
        await this.audit.record(
          {
            companyId,
            actorType: AuditActor.InternalUser,
            actorId: actorUserId,
            action: AuditAction.UserCreate,
            outcome: AuditResult.Succeeded,
            targetType: 'user',
            targetId: user.id,
            ...auditContext,
            metadata: { roleCount: roleIds.length, invitation: true },
          },
          transaction,
        );
        return this.toUserResponse(user);
      });
      const invitationUrl = new URL(
        this.config.get<string>(
          'INVITATION_URL_BASE',
          'http://localhost:3000/accept-invitation',
        ),
      );
      invitationUrl.searchParams.set('token', token);
      await this.emailDelivery.deliverInvitation({
        companyId,
        recipient: dto.email,
        invitationUrl: invitationUrl.toString(),
        expiresAt: expiresAt.toISOString(),
      });
      return invitation;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Username or email is already in use');
      }
      throw error;
    }
  }

  async update(
    companyId: string,
    actorUserId: string,
    userId: string,
    dto: UpdateUserDto,
    auditContext: AuditRequestContext,
  ) {
    const target = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      select: { id: true, status: true },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (target.status === 'INVITED' && dto.status === 'ACTIVE') {
      throw new BadRequestException(
        'An invited user must accept the invitation before activation',
      );
    }

    const installation = await this.prisma.installation.findUnique({
      where: { companyId },
      select: { ownerId: true },
    });
    if (!installation) {
      throw new NotFoundException('Installation not found');
    }
    if (
      installation.ownerId === userId &&
      (dto.status !== undefined || dto.roleIds !== undefined)
    ) {
      throw new ForbiddenException(
        'The installation owner cannot be suspended or reassigned',
      );
    }
    if (actorUserId === userId && dto.status === 'SUSPENDED') {
      throw new BadRequestException('You cannot suspend your own account');
    }

    const roleIds = dto.roleIds
      ? await this.validateAssignableRoles(companyId, dto.roleIds)
      : undefined;
    return this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.update({
        where: { id: userId },
        data: {
          ...(dto.displayName !== undefined
            ? { displayName: dto.displayName || null }
            : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(roleIds
            ? {
                roles: {
                  deleteMany: {},
                  create: roleIds.map((roleId) => ({ roleId })),
                },
              }
            : {}),
        },
        select: USER_SELECT,
      });
      await this.audit.record(
        {
          companyId,
          actorType: AuditActor.InternalUser,
          actorId: actorUserId,
          action: AuditAction.UserUpdate,
          outcome: AuditResult.Succeeded,
          targetType: 'user',
          targetId: user.id,
          ...auditContext,
          metadata: {
            roleAssignmentChanged: roleIds !== undefined,
            statusChanged: dto.status !== undefined,
            displayNameChanged: dto.displayName !== undefined,
          },
        },
        transaction,
      );
      return this.toUserResponse(user);
    });
  }

  private async validateAssignableRoles(companyId: string, roleIds: string[]) {
    const distinctRoleIds = [...new Set(roleIds)];
    const roles = await this.prisma.role.findMany({
      where: { id: { in: distinctRoleIds }, companyId },
      select: { id: true, code: true },
    });
    if (
      roles.length !== distinctRoleIds.length ||
      roles.some((role) => role.code === SystemRoleCode.Owner)
    ) {
      throw new BadRequestException('One or more roles cannot be assigned');
    }
    return distinctRoleIds;
  }

  private toUserResponse(user: {
    id: string;
    username: string;
    email: string;
    displayName: string | null;
    locale: string | null;
    timeZone: string | null;
    status: string;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    roles: {
      role: { id: string; code: string; name: string; isSystem: boolean };
    }[];
  }) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      locale: user.locale,
      timeZone: user.timeZone,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles.map(({ role }) => role),
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
