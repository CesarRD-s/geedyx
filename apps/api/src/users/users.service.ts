import argon2 from 'argon2';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SystemRoleCode } from '../auth/authorization/permissions.js';
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
  constructor(private readonly prisma: PrismaService) {}

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

  async create(companyId: string, dto: CreateUserDto) {
    const roleIds = await this.validateAssignableRoles(companyId, dto.roleIds);
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    try {
      const user = await this.prisma.user.create({
        data: {
          companyId,
          username: dto.username,
          email: dto.email,
          passwordHash,
          displayName: dto.displayName || null,
          roles: { create: roleIds.map((roleId) => ({ roleId })) },
        },
        select: USER_SELECT,
      });
      return this.toUserResponse(user);
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
  ) {
    const target = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException('User not found');
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
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined
          ? { displayName: dto.displayName || null }
          : {}),
        ...(dto.locale !== undefined ? { locale: dto.locale } : {}),
        ...(dto.timeZone !== undefined ? { timeZone: dto.timeZone } : {}),
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
    return this.toUserResponse(user);
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
    locale: string;
    timeZone: string;
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
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
