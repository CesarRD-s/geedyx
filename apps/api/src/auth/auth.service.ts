import argon2 from 'argon2';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'node:crypto';
import type { UserModel } from '../generated/prisma/models.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { durationToMs } from './duration.js';
import {
  ALL_PERMISSION_CODES,
  isPermissionCode,
  PermissionCode,
  SystemRoleCode,
} from './authorization/permissions.js';
import { LoginDto } from './dto/login.dto.js';
import { SetupDto } from './dto/setup.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  companyId: string;
  displayName: string | null;
  locale: string;
  timeZone: string;
  permissions: PermissionCode[];
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  csrfToken: string;
  cookieMaxAge: number;
}

function toAuthUser(
  user: Pick<
    UserModel,
    | 'id'
    | 'username'
    | 'email'
    | 'companyId'
    | 'displayName'
    | 'locale'
    | 'timeZone'
  >,
  permissions: PermissionCode[] = [],
): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    companyId: user.companyId,
    displayName: user.displayName,
    locale: user.locale,
    timeZone: user.timeZone,
    permissions,
  };
}

async function argon2Hash(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

async function argon2Verify(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async setup(dto: SetupDto): Promise<AuthSession> {
    const existingInstallation = await this.prisma.installation.findUnique({
      where: { id: 'singleton' },
      select: { id: true },
    });
    if (existingInstallation) {
      throw new ForbiddenException('Setup already completed');
    }

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const passwordHash = await argon2Hash(dto.password);

    try {
      const user = await this.prisma.$transaction(async (transaction) => {
        const company = await transaction.company.create({
          data: {},
          select: { id: true },
        });
        const owner = await transaction.user.create({
          data: {
            username: dto.username,
            email: dto.email,
            passwordHash,
            companyId: company.id,
          },
          select: {
            id: true,
            username: true,
            email: true,
            companyId: true,
            displayName: true,
            locale: true,
            timeZone: true,
          },
        });
        const ownerRole = await transaction.role.create({
          data: {
            companyId: company.id,
            code: SystemRoleCode.Owner,
            name: 'Propietario',
            description: 'Acceso total e inmutable a la empresa',
            isSystem: true,
            permissions: {
              create: ALL_PERMISSION_CODES.map((code) => ({
                permission: { connect: { code } },
              })),
            },
          },
          select: { id: true },
        });
        await transaction.userRole.create({
          data: { userId: owner.id, roleId: ownerRole.id },
        });
        await transaction.installation.create({
          data: {
            id: 'singleton',
            companyId: company.id,
            ownerId: owner.id,
          },
        });
        return owner;
      });

      return this.buildSession(user);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ForbiddenException('Setup already completed');
      }
      throw error;
    }
  }

  async getInstallationStatus(): Promise<{ installed: boolean }> {
    const installation = await this.prisma.installation.findUnique({
      where: { id: 'singleton' },
      select: { id: true },
    });
    return { installed: installation !== null };
  }

  async login(dto: LoginDto): Promise<AuthSession> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !(await argon2Verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.buildSession(user);
  }

  async getProfile(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        companyId: true,
        displayName: true,
        locale: true,
        timeZone: true,
        roles: {
          select: {
            role: {
              select: {
                permissions: {
                  select: { permission: { select: { code: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const permissions = user.roles.flatMap((userRole) =>
      userRole.role.permissions.flatMap((rolePermission) => {
        const { code } = rolePermission.permission;
        return isPermissionCode(code) ? [code] : [];
      }),
    );
    return toAuthUser(user, [...new Set(permissions)]);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<AuthUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined
          ? { displayName: dto.displayName || null }
          : {}),
        ...(dto.locale !== undefined ? { locale: dto.locale } : {}),
        ...(dto.timeZone !== undefined ? { timeZone: dto.timeZone } : {}),
      },
      select: { id: true },
    });
    return this.getProfile(user.id);
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async listSessions(userId: string, currentSessionId: string) {
    return this.prisma.session
      .findMany({
        where: {
          userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          idleExpiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          userAgent: true,
          ipAddress: true,
          createdAt: true,
          lastUsedAt: true,
          expiresAt: true,
        },
        orderBy: { lastUsedAt: 'desc' },
      })
      .then((sessions) =>
        sessions.map((session) => ({
          ...session,
          current: session.id === currentSessionId,
        })),
      );
  }

  async revokeOtherSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, id: { not: currentSessionId }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeSessionForUser(userId: string, sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentSessionId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user || !(await argon2Verify(user.passwordHash, currentPassword)))
      throw new UnauthorizedException('Invalid credentials');
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: await argon2Hash(newPassword),
          passwordChangedAt: now,
        },
      }),
      this.prisma.session.updateMany({
        where: { userId, id: { not: currentSessionId }, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
  }

  private async buildSession(
    user: Pick<
      UserModel,
      | 'id'
      | 'username'
      | 'email'
      | 'companyId'
      | 'displayName'
      | 'locale'
      | 'timeZone'
    >,
  ): Promise<AuthSession> {
    const token = randomBytes(32).toString('base64url');
    const csrfToken = randomBytes(32).toString('base64url');
    const cookieMaxAge = durationToMs(
      this.configService.get<string>('SESSION_ABSOLUTE_TTL', '12h'),
    );
    const now = new Date();
    const maximumSessions = Number(
      this.configService.get<string>('SESSION_MAX_PER_USER', '5'),
    );
    const activeSessions = await this.prisma.session.findMany({
      where: { userId: user.id, revokedAt: null },
      select: { id: true },
      orderBy: { lastUsedAt: 'asc' },
    });
    const sessionsToRevoke = activeSessions.slice(
      Math.max(0, activeSessions.length - maximumSessions + 1),
    );
    if (sessionsToRevoke.length > 0) {
      await this.prisma.session.updateMany({
        where: { id: { in: sessionsToRevoke.map((session) => session.id) } },
        data: { revokedAt: now },
      });
    }
    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        csrfTokenHash: createHash('sha256').update(csrfToken).digest('hex'),
        idleExpiresAt: new Date(
          now.getTime() +
            durationToMs(
              this.configService.get<string>('SESSION_IDLE_TTL', '30m'),
            ),
        ),
        expiresAt: new Date(now.getTime() + cookieMaxAge),
      },
    });

    return { user: toAuthUser(user), token, csrfToken, cookieMaxAge };
  }
}
