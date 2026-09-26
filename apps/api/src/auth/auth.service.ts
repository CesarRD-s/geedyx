import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import type { AuthSession, AuthUser, LogoutResult } from '@geedyx/contracts';
import type { AppEnvironment } from '../config/environment';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, verifyPassword } from './password';
import { createOpaqueToken, hashOpaqueToken } from './auth.utils';
import type { LoginDto } from './dto/login.dto';

const SESSION_IDLE_MS = 30 * 60 * 1000;
const SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000;
const LOGIN_ATTEMPT_LIMIT = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const MAX_ACTIVE_SESSIONS = 5;

const USER_AUTHORIZATION_INCLUDE = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

type UserWithAuthorization = Prisma.UserGetPayload<{
  include: typeof USER_AUTHORIZATION_INCLUDE;
}>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppEnvironment, true>,
  ) {}

  getSessionCookieName(): string {
    return this.config.get('SESSION_COOKIE_NAME', { infer: true });
  }

  getCsrfCookieName(): string {
    return this.config.get('CSRF_COOKIE_NAME', { infer: true });
  }

  createCsrfToken(): string {
    return createOpaqueToken();
  }

  setCsrfCookie(response: Response, token: string): void {
    response.cookie(this.getCsrfCookieName(), token, {
      httpOnly: false,
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_ABSOLUTE_MS,
    });
  }

  setSessionCookie(response: Response, token: string, expiresAt: string): void {
    const maxAge = Math.max(0, new Date(expiresAt).getTime() - Date.now());
    response.cookie(this.getSessionCookieName(), token, {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
  }

  clearSessionCookie(response: Response): void {
    response.clearCookie(this.getSessionCookieName(), {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      sameSite: 'lax',
      path: '/',
    });
  }

  async login(
    dto: LoginDto,
    requestId: string | undefined,
    ipAddress: string | undefined,
    userAgent: string | undefined,
  ): Promise<{ token: string; session: AuthSession }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.findUserByEmail(email);

    if (!user) {
      await hashPassword(dto.password);
      await this.recordLoginFailure(undefined, requestId, 'INVALID_CREDENTIALS');
      throw this.invalidCredentials();
    }

    const now = new Date();
    if (user.status === 'LOCKED' && this.canReleaseAutomaticLock(user, now)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          status: 'ACTIVE',
          failedLoginAttempts: 0,
          lockedUntil: null,
          lockReason: null,
        },
      });
      user.status = 'ACTIVE';
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      user.lockReason = null;
    }

    const passwordIsValid = await verifyPassword(user.passwordHash, dto.password);
    if (!passwordIsValid || user.status === 'DISABLED' || user.status === 'LOCKED') {
      await this.recordLoginFailure(user, requestId, 'INVALID_CREDENTIALS');
      throw this.invalidCredentials();
    }

    const activeSessions = await this.prisma.session.count({
      where: {
        userId: user.id,
        revokedAt: null,
        expiresAt: { gt: now },
        absoluteExpiresAt: { gt: now },
      },
    });
    if (activeSessions >= MAX_ACTIVE_SESSIONS) {
      throw new ConflictException({
        code: 'SESSION_LIMIT_REACHED',
        detail: 'Se alcanzó el límite de sesiones activas.',
      });
    }

    const token = createOpaqueToken();
    const idleExpiresAt = new Date(now.getTime() + SESSION_IDLE_MS);
    const absoluteExpiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_MS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lockReason: null,
        },
      }),
      this.prisma.session.create({
        data: {
          userId: user.id,
          tokenHash: hashOpaqueToken(token),
          expiresAt: idleExpiresAt,
          absoluteExpiresAt,
          ipAddress,
          userAgent,
        },
      }),
      this.prisma.auditEvent.create({
        data: {
          companyId: user.companyId,
          actorUserId: user.id,
          module: 'auth',
          action: 'LOGIN',
          outcome: 'SUCCESS',
          entityType: 'Session',
          requestId,
        },
      }),
    ]);

    return {
      token,
      session: {
        user: this.toAuthUser(user),
        expiresAt: idleExpiresAt.toISOString(),
      },
    };
  }

  async resolveSession(
    token: string | undefined,
  ): Promise<AuthSession & { sessionId: string }> {
    if (!token) throw this.unauthenticated();

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashOpaqueToken(token) },
      include: {
        user: {
          include: USER_AUTHORIZATION_INCLUDE,
        },
      },
    });
    if (!session) throw this.unauthenticated();

    const now = new Date();
    if (
      session.revokedAt ||
      session.expiresAt <= now ||
      session.absoluteExpiresAt <= now ||
      session.user.status !== 'ACTIVE'
    ) {
      if (!session.revokedAt) {
        await this.revokeSession(session.id, 'EXPIRED_OR_UNAVAILABLE');
      }
      throw this.unauthenticated();
    }

    const nextExpiresAt = new Date(
      Math.min(now.getTime() + SESSION_IDLE_MS, session.absoluteExpiresAt.getTime()),
    );
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        lastActivityAt: now,
        expiresAt: nextExpiresAt,
      },
    });

    return {
      sessionId: session.id,
      user: this.toAuthUser(session.user),
      expiresAt: nextExpiresAt.toISOString(),
    };
  }

  async logout(
    token: string | undefined,
    requestId: string | undefined,
  ): Promise<LogoutResult> {
    if (token) {
      const session = await this.prisma.session.findUnique({
        where: { tokenHash: hashOpaqueToken(token) },
        select: {
          id: true,
          userId: true,
          user: {
            select: {
              companyId: true,
            },
          },
        },
      });
      if (session) {
        await this.prisma.$transaction([
          this.prisma.session.updateMany({
            where: {
              id: session.id,
              revokedAt: null,
            },
            data: {
              revokedAt: new Date(),
              revokedReason: 'LOGOUT',
            },
          }),
          this.prisma.auditEvent.create({
            data: {
              companyId: session.user.companyId,
              actorUserId: session.userId,
              module: 'auth',
              action: 'LOGOUT',
              outcome: 'SUCCESS',
              entityType: 'Session',
              entityId: session.id,
              requestId,
            },
          }),
        ]);
      }
    }

    return { loggedOut: true };
  }

  private async findUserByEmail(email: string): Promise<UserWithAuthorization | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: USER_AUTHORIZATION_INCLUDE,
    });
  }

  private canReleaseAutomaticLock(user: UserWithAuthorization, now: Date): boolean {
    return (
      user.lockReason === 'AUTOMATIC_LOGIN_FAILURE' &&
      user.lockedUntil !== null &&
      user.lockedUntil <= now
    );
  }

  private async recordLoginFailure(
    user: UserWithAuthorization | undefined,
    requestId: string | undefined,
    reason: 'INVALID_CREDENTIALS',
  ): Promise<void> {
    if (!user) {
      await this.prisma.auditEvent.create({
        data: {
          module: 'auth',
          action: 'LOGIN',
          outcome: 'FAILURE',
          requestId,
          metadata: { reason },
        },
      });
      return;
    }

    if (user.status !== 'ACTIVE') {
      await this.prisma.auditEvent.create({
        data: {
          companyId: user.companyId,
          module: 'auth',
          action: 'LOGIN',
          outcome: 'FAILURE',
          entityType: 'User',
          entityId: user.id,
          requestId,
          metadata: { reason },
        },
      });
      return;
    }

    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= LOGIN_ATTEMPT_LIMIT;
    const lockedUntil = shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null;
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          ...(shouldLock
            ? {
                status: 'LOCKED',
                lockedUntil,
                lockReason: 'AUTOMATIC_LOGIN_FAILURE',
              }
            : {}),
        },
      }),
      this.prisma.auditEvent.create({
        data: {
          companyId: user.companyId,
          module: 'auth',
          action: shouldLock ? 'LOGIN_LOCKED' : 'LOGIN',
          outcome: 'FAILURE',
          entityType: 'User',
          entityId: user.id,
          requestId,
          metadata: {
            reason,
            attempts,
          },
        },
      }),
    ]);
  }

  private async revokeSession(sessionId: string, reason: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  private toAuthUser(user: UserWithAuthorization): AuthUser {
    const permissions = new Set<string>();
    for (const userRole of user.roles) {
      for (const rolePermission of userRole.role.permissions) {
        permissions.add(rolePermission.permission.code);
      }
    }

    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      status: user.status,
      passwordChangeRequired: user.passwordChangeRequired,
      roles: user.roles.map(({ role }) => role.code),
      permissions: [...permissions].sort(),
    };
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      detail: 'El correo o la contraseña no son válidos.',
    });
  }

  private unauthenticated(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'UNAUTHENTICATED',
      detail: 'La sesión no es válida o ya expiró.',
    });
  }
}
