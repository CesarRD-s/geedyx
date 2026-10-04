import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import type {
  ActiveSession,
  AuthSession,
  AuthUser,
  LogoutResult,
  PasswordChanged,
  SessionManagementDetails,
  UserPreferences,
} from '@geedyx/contracts';
import type { AppEnvironment } from '../config/environment';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, verifyPassword } from './password';
import { createOpaqueToken, hashOpaqueToken } from './auth.utils';
import type { LoginDto } from './dto/login.dto';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto';

const SESSION_IDLE_MS = 30 * 60 * 1000;
const SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000;
const LOGIN_ATTEMPT_LIMIT = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const MAX_ACTIVE_SESSIONS = 5;
const SESSION_CHALLENGE_DURATION_MS = 10 * 60 * 1000;
const SERIALIZATION_RETRY_LIMIT = 3;

const USER_AUTHORIZATION_INCLUDE = {
  company: {
    select: {
      locale: true,
      timeZone: true,
    },
  },
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
    const temporaryPasswordExpired =
      user.passwordChangeRequired &&
      user.passwordExpiresAt !== null &&
      user.passwordExpiresAt <= now;
    if (
      !passwordIsValid ||
      user.status === 'DISABLED' ||
      user.status === 'LOCKED' ||
      temporaryPasswordExpired
    ) {
      await this.recordLoginFailure(user, requestId, 'INVALID_CREDENTIALS');
      throw this.invalidCredentials();
    }

    const result = await this.createSessionOrChallenge(
      user,
      now,
      requestId,
      ipAddress,
      userAgent,
    );
    if ('sessionManagement' in result) {
      throw new ConflictException({
        code: 'SESSION_LIMIT_REACHED',
        detail: 'Se alcanzó el límite de sesiones activas.',
        sessionManagement: result.sessionManagement,
      });
    }

    return result;
  }

  async changePassword(
    sessionId: string,
    currentPassword: string,
    newPassword: string,
    requestId: string | undefined,
  ): Promise<PasswordChanged> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        userId: true,
        user: {
          select: {
            companyId: true,
            passwordHash: true,
          },
        },
      },
    });
    if (!session) {
      throw this.unauthenticated();
    }

    const passwordIsValid = await verifyPassword(
      session.user.passwordHash,
      currentPassword,
    );
    if (!passwordIsValid) {
      throw new UnauthorizedException({
        code: 'PASSWORD_CURRENT_INVALID',
        detail: 'La contraseña actual no es válida.',
      });
    }

    const passwordHash = await hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: session.userId },
        data: {
          passwordHash,
          passwordChangeRequired: false,
          passwordExpiresAt: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
          lockReason: null,
        },
      }),
      this.prisma.session.updateMany({
        where: {
          userId: session.userId,
          id: { not: sessionId },
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokedReason: 'PASSWORD_CHANGED',
        },
      }),
      this.prisma.auditEvent.create({
        data: {
          companyId: session.user.companyId,
          actorUserId: session.userId,
          module: 'auth',
          action: 'PASSWORD_CHANGED',
          outcome: 'SUCCESS',
          entityType: 'User',
          entityId: session.userId,
          requestId,
        },
      }),
    ]);

    return { passwordChanged: true };
  }

  async resolveSession(
    token: string | undefined,
    options: { touchActivity?: boolean } = {},
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

    const nextExpiresAt = options.touchActivity
      ? new Date(
          Math.min(
            now.getTime() + SESSION_IDLE_MS,
            session.absoluteExpiresAt.getTime(),
          ),
        )
      : session.expiresAt;
    if (options.touchActivity) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          lastActivityAt: now,
          expiresAt: nextExpiresAt,
        },
      });
    }

    return {
      sessionId: session.id,
      user: this.toAuthUser(session.user),
      expiresAt: nextExpiresAt.toISOString(),
    };
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        language: true,
        timeZone: true,
        company: {
          select: {
            locale: true,
            timeZone: true,
          },
        },
      },
    });
    if (!user) throw this.unauthenticated();

    return this.toUserPreferences(user);
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
    requestId: string | undefined,
  ): Promise<UserPreferences> {
    if (dto.timeZone !== undefined && dto.timeZone !== null) {
      this.assertValidTimeZone(dto.timeZone);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: { id: userId },
        select: {
          companyId: true,
          language: true,
          timeZone: true,
          company: {
            select: {
              locale: true,
              timeZone: true,
            },
          },
        },
      });
      if (!current) throw this.unauthenticated();

      const data = {
        ...(dto.language !== undefined ? { language: dto.language } : {}),
        ...(dto.timeZone !== undefined ? { timeZone: dto.timeZone } : {}),
      };
      if (Object.keys(data).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data,
        });
        await tx.auditEvent.create({
          data: {
            companyId: current.companyId,
            actorUserId: userId,
            module: 'configuration',
            action: 'USER_PREFERENCES_UPDATED',
            outcome: 'SUCCESS',
            entityType: 'User',
            entityId: userId,
            requestId,
            metadata: {
              fields: Object.keys(data),
            },
          },
        });
      }

      return {
        language: dto.language !== undefined ? dto.language : current.language,
        timeZone: dto.timeZone !== undefined ? dto.timeZone : current.timeZone,
        company: current.company,
      };
    });

    return this.toUserPreferences(updated);
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

  async listSessions(
    actorUserId: string,
    targetUserId: string = actorUserId,
  ): Promise<{ sessions: ActiveSession[] }> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { companyId: true },
    });
    if (!actor) throw this.unauthenticated();

    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, companyId: actor.companyId },
      select: { id: true },
    });
    if (!target) {
      throw new ConflictException({
        code: 'USER_NOT_FOUND',
        detail: 'El usuario no existe en esta empresa.',
      });
    }

    const now = new Date();
    const sessions = await this.prisma.session.findMany({
      where: {
        userId: target.id,
        revokedAt: null,
        expiresAt: { gt: now },
        absoluteExpiresAt: { gt: now },
      },
      orderBy: { lastActivityAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        lastActivityAt: true,
        expiresAt: true,
        userAgent: true,
        ipAddress: true,
      },
    });
    return { sessions: sessions.map((session) => this.toActiveSession(session)) };
  }

  async revokeManagedSession(
    actorUserId: string,
    targetUserId: string,
    sessionId: string,
    requestId: string | undefined,
  ): Promise<{ revoked: true }> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { companyId: true },
    });
    if (!actor) throw this.unauthenticated();
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: targetUserId,
        user: { companyId: actor.companyId },
        revokedAt: null,
      },
      select: {
        id: true,
        userId: true,
        user: { select: { companyId: true } },
      },
    });
    if (!session) return { revoked: true };

    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          revokedReason: 'ADMINISTRATIVE_REVOCATION',
        },
      }),
      this.prisma.auditEvent.create({
        data: {
          companyId: session.user.companyId,
          actorUserId,
          module: 'auth',
          action: 'SESSION_REVOKED',
          outcome: 'SUCCESS',
          entityType: 'Session',
          entityId: session.id,
          requestId,
          metadata: { targetUserId: session.userId },
        },
      }),
    ]);
    return { revoked: true };
  }

  async revokeOwnSession(
    actorUserId: string,
    sessionId: string,
    requestId: string | undefined,
  ): Promise<{ revoked: true }> {
    return this.revokeManagedSession(actorUserId, actorUserId, sessionId, requestId);
  }

  async revokeSessionWithChallenge(
    token: string | undefined,
    sessionId: string,
    requestId: string | undefined,
  ): Promise<{ revoked: true }> {
    if (!token) {
      throw this.invalidSessionManagementChallenge();
    }

    const challenge = await this.prisma.sessionManagementChallenge.findUnique({
      where: { tokenHash: hashOpaqueToken(token) },
    });
    const now = new Date();
    if (!challenge || challenge.expiresAt <= now) {
      throw this.invalidSessionManagementChallenge();
    }

    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: challenge.userId,
        revokedAt: null,
        expiresAt: { gt: now },
        absoluteExpiresAt: { gt: now },
      },
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
    if (!session) {
      return { revoked: true };
    }

    await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: {
          id: session.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
          revokedReason: 'SESSION_MANAGEMENT',
        },
      }),
      this.prisma.auditEvent.create({
        data: {
          companyId: session.user.companyId,
          actorUserId: session.userId,
          module: 'auth',
          action: 'SESSION_REVOKED',
          outcome: 'SUCCESS',
          entityType: 'Session',
          entityId: session.id,
          requestId,
        },
      }),
    ]);

    return { revoked: true };
  }

  private async createSessionOrChallenge(
    user: UserWithAuthorization,
    now: Date,
    requestId: string | undefined,
    ipAddress: string | undefined,
    userAgent: string | undefined,
  ): Promise<
    | { token: string; session: AuthSession }
    | { sessionManagement: SessionManagementDetails }
  > {
    for (let attempt = 0; attempt < SERIALIZATION_RETRY_LIMIT; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const activeSessions = await tx.session.count({
              where: {
                userId: user.id,
                revokedAt: null,
                expiresAt: { gt: now },
                absoluteExpiresAt: { gt: now },
              },
            });
            await tx.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
                lockReason: null,
              },
            });

            if (activeSessions >= MAX_ACTIVE_SESSIONS) {
              const challengeToken = createOpaqueToken();
              const activeSessionRows = await tx.session.findMany({
                where: {
                  userId: user.id,
                  revokedAt: null,
                  expiresAt: { gt: now },
                  absoluteExpiresAt: { gt: now },
                },
                orderBy: { lastActivityAt: 'desc' },
                select: {
                  id: true,
                  createdAt: true,
                  lastActivityAt: true,
                  expiresAt: true,
                  userAgent: true,
                  ipAddress: true,
                },
              });
              await tx.sessionManagementChallenge.deleteMany({
                where: {
                  userId: user.id,
                  expiresAt: { lte: now },
                },
              });
              await tx.sessionManagementChallenge.create({
                data: {
                  userId: user.id,
                  tokenHash: hashOpaqueToken(challengeToken),
                  expiresAt: new Date(now.getTime() + SESSION_CHALLENGE_DURATION_MS),
                },
              });
              await tx.auditEvent.create({
                data: {
                  companyId: user.companyId,
                  actorUserId: user.id,
                  module: 'auth',
                  action: 'LOGIN_SESSION_LIMIT',
                  outcome: 'SUCCESS',
                  entityType: 'User',
                  entityId: user.id,
                  requestId,
                },
              });

              return {
                sessionManagement: {
                  token: challengeToken,
                  sessions: activeSessionRows.map((session) =>
                    this.toActiveSession(session),
                  ),
                },
              };
            }

            const token = createOpaqueToken();
            const idleExpiresAt = new Date(now.getTime() + SESSION_IDLE_MS);
            const absoluteExpiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_MS);
            await tx.session.create({
              data: {
                userId: user.id,
                tokenHash: hashOpaqueToken(token),
                expiresAt: idleExpiresAt,
                absoluteExpiresAt,
                ipAddress,
                userAgent,
              },
            });
            await tx.auditEvent.create({
              data: {
                companyId: user.companyId,
                actorUserId: user.id,
                module: 'auth',
                action: 'LOGIN',
                outcome: 'SUCCESS',
                entityType: 'Session',
                requestId,
              },
            });

            return {
              token,
              session: {
                user: this.toAuthUser(user),
                expiresAt: idleExpiresAt.toISOString(),
              },
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < SERIALIZATION_RETRY_LIMIT - 1
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException({
      code: 'SESSION_LIMIT_REACHED',
      detail: 'No se pudo reservar una sesión nueva.',
    });
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

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: user.id,
          status: 'ACTIVE',
        },
        data: {
          failedLoginAttempts: { increment: 1 },
        },
      });
      if (updated.count === 0) {
        return;
      }

      const currentUser = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          failedLoginAttempts: true,
        },
      });
      const shouldLock = currentUser.failedLoginAttempts >= LOGIN_ATTEMPT_LIMIT;
      const lockedUntil = shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null;
      if (shouldLock) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            status: 'LOCKED',
            lockedUntil,
            lockReason: 'AUTOMATIC_LOGIN_FAILURE',
          },
        });
      }
      await tx.auditEvent.create({
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
            attempts: currentUser.failedLoginAttempts,
          },
        },
      });
    });
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
      language: user.language as 'es' | 'en' | null,
      timeZone: user.timeZone,
      effectiveLanguage: this.normalizeLanguage(user.language ?? user.company.locale),
      effectiveTimeZone: user.timeZone ?? user.company.timeZone,
      roles: user.roles.map(({ role }) => role.code),
      permissions: [...permissions].sort(),
    };
  }

  private toUserPreferences(user: {
    language: string | null;
    timeZone: string | null;
    company: { locale: string; timeZone: string | null };
  }): UserPreferences {
    return {
      language: user.language as 'es' | 'en' | null,
      timeZone: user.timeZone,
      effectiveLanguage: this.normalizeLanguage(user.language ?? user.company.locale),
      effectiveTimeZone: user.timeZone ?? user.company.timeZone,
      companyLanguage: this.normalizeLanguage(user.company.locale),
      companyTimeZone: user.company.timeZone,
    };
  }

  private normalizeLanguage(language: string): 'es' | 'en' {
    return language === 'en' ? 'en' : 'es';
  }

  private assertValidTimeZone(timeZone: string): void {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone }).format();
    } catch {
      throw new BadRequestException({
        code: 'INVALID_TIME_ZONE',
        detail: 'La zona horaria no es válida.',
      });
    }
  }

  private toActiveSession(session: {
    id: string;
    createdAt: Date;
    lastActivityAt: Date;
    expiresAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
  }): ActiveSession {
    return {
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
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

  private invalidSessionManagementChallenge(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'SESSION_MANAGEMENT_INVALID',
      detail: 'La autorización para administrar sesiones no es válida.',
    });
  }
}
