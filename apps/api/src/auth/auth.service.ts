import { resolveRegionalContext } from './regional-context.js';
import argon2 from 'argon2';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'node:crypto';
import type { UserModel } from '../generated/prisma/models.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AuditAction,
  AuditActor,
  AuditResult,
  AuditService,
  type AuditRequestContext,
} from '../audit/audit.service.js';
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
import { PasswordResetDeliveryService } from './password-reset-delivery.service.js';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  companyId: string;
  displayName: string | null;
  locale: string | null;
  timeZone: string | null;
  regionalContext: ReturnType<typeof resolveRegionalContext>;
  permissions: PermissionCode[];
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  csrfToken: string;
  cookieMaxAge: number;
}

export interface RotatedSessionCredentials {
  token: string;
  csrfToken: string;
  cookieMaxAge: number;
}

export interface ReauthenticationResult extends RotatedSessionCredentials {
  reauthenticatedUntil: Date;
}

interface BuiltAuthSession extends AuthSession {
  sessionId: string;
  revokedSessionCount: number;
}

type SessionDatabase = Pick<Prisma.TransactionClient, 'company' | 'session'>;

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
  company: {
    locale: string | null;
    timeZone: string | null;
    currency: string | null;
  },
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
    regionalContext: resolveRegionalContext(user, company),
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
    private readonly audit: AuditService,
    @Optional()
    private readonly passwordResetDelivery?: PasswordResetDeliveryService,
  ) {}

  async setup(
    dto: SetupDto,
    auditContext: AuditRequestContext,
  ): Promise<AuthSession> {
    const existingInstallation = await this.prisma.installation.findUnique({
      where: { id: 'singleton' },
      select: { id: true, companyId: true },
    });
    if (existingInstallation) {
      await this.audit.record({
        companyId: existingInstallation.companyId,
        actorType: AuditActor.Anonymous,
        action: AuditAction.InstallationComplete,
        outcome: AuditResult.Denied,
        targetType: 'company',
        targetId: existingInstallation.companyId,
        ...auditContext,
        metadata: { reason: 'already_completed' },
      });
      throw new ForbiddenException('Setup already completed');
    }

    if (dto.password !== dto.confirmPassword) {
      await this.audit.record({
        actorType: AuditActor.Anonymous,
        action: AuditAction.InstallationComplete,
        outcome: AuditResult.Failed,
        ...auditContext,
        metadata: { reason: 'password_mismatch' },
      });
      throw new BadRequestException('Passwords do not match');
    }

    const passwordHash = await argon2Hash(dto.password);

    try {
      return await this.prisma.$transaction(async (transaction) => {
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
        const session = await this.buildSession(owner, transaction);
        await this.audit.record(
          {
            companyId: company.id,
            actorType: AuditActor.InternalUser,
            actorId: owner.id,
            action: AuditAction.InstallationComplete,
            outcome: AuditResult.Succeeded,
            targetType: 'company',
            targetId: company.id,
            ...auditContext,
          },
          transaction,
        );
        return session;
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        await this.audit.record({
          actorType: AuditActor.Anonymous,
          action: AuditAction.InstallationComplete,
          outcome: AuditResult.Denied,
          ...auditContext,
          metadata: { reason: 'concurrent_completion' },
        });
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

  async login(
    dto: LoginDto,
    auditContext: AuditRequestContext,
  ): Promise<AuthSession> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !(await argon2Verify(user.passwordHash, dto.password))) {
      await this.audit.record({
        companyId: user?.companyId,
        actorType: AuditActor.Anonymous,
        action: AuditAction.Login,
        outcome: AuditResult.Failed,
        targetType: user ? 'user' : undefined,
        targetId: user?.id,
        ...auditContext,
        metadata: {
          reason: 'invalid_credentials',
          identityHash: this.hashCredential(dto.email.trim().toLowerCase()),
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status === 'SUSPENDED') {
      await this.audit.record({
        companyId: user.companyId,
        actorType: AuditActor.Anonymous,
        action: AuditAction.Login,
        outcome: AuditResult.Denied,
        targetType: 'user',
        targetId: user.id,
        ...auditContext,
        metadata: { reason: 'account_unavailable' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      const session = await this.buildSession(user, transaction);
      await this.audit.record(
        {
          companyId: user.companyId,
          actorType: AuditActor.InternalUser,
          actorId: user.id,
          action: AuditAction.Login,
          outcome: AuditResult.Succeeded,
          targetType: 'session',
          targetId: session.sessionId,
          ...auditContext,
          metadata: { revokedSessionCount: session.revokedSessionCount },
        },
        transaction,
      );
      return session;
    });
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
        company: { select: { locale: true, timeZone: true, currency: true } },
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
    return toAuthUser(user, user.company, [...new Set(permissions)]);
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

  async revokeSession(
    userId: string,
    companyId: string,
    sessionId: string,
    auditContext: AuditRequestContext,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.session.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.record(
        {
          companyId,
          actorType: AuditActor.InternalUser,
          actorId: userId,
          action: AuditAction.Logout,
          outcome: AuditResult.Succeeded,
          targetType: 'session',
          targetId: sessionId,
          ...auditContext,
          metadata: { revoked: revoked.count === 1 },
        },
        transaction,
      );
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
    companyId: string,
    currentSessionId: string,
    auditContext: AuditRequestContext,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.session.updateMany({
        where: { userId, id: { not: currentSessionId }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.record(
        {
          companyId,
          actorType: AuditActor.InternalUser,
          actorId: userId,
          action: AuditAction.OtherSessionsRevoke,
          outcome: AuditResult.Succeeded,
          targetType: 'user',
          targetId: userId,
          ...auditContext,
          metadata: { revokedSessionCount: revoked.count },
        },
        transaction,
      );
    });
  }

  async revokeSessionForUser(
    userId: string,
    companyId: string,
    sessionId: string,
    auditContext: AuditRequestContext,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.session.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.record(
        {
          companyId,
          actorType: AuditActor.InternalUser,
          actorId: userId,
          action: AuditAction.SessionRevoke,
          outcome: AuditResult.Succeeded,
          targetType: 'session',
          targetId: sessionId,
          ...auditContext,
          metadata: { revoked: revoked.count === 1 },
        },
        transaction,
      );
    });
  }

  async changePassword(
    userId: string,
    companyId: string,
    currentPassword: string,
    newPassword: string,
    currentSessionId: string,
    auditContext: AuditRequestContext,
  ): Promise<RotatedSessionCredentials> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user || !(await argon2Verify(user.passwordHash, currentPassword))) {
      await this.audit.record({
        companyId,
        actorType: AuditActor.InternalUser,
        actorId: userId,
        action: AuditAction.PasswordChange,
        outcome: AuditResult.Failed,
        targetType: 'user',
        targetId: userId,
        ...auditContext,
        metadata: { reason: 'invalid_current_password' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    const now = new Date();
    const passwordHash = await argon2Hash(newPassword);
    const credentials = this.createSessionCredentials();
    const expiresAt = await this.prisma.$transaction(async (transaction) => {
      const currentSession = await transaction.session.findFirst({
        where: { id: currentSessionId, userId, revokedAt: null },
        select: { expiresAt: true },
      });
      if (!currentSession || currentSession.expiresAt <= now) {
        throw new UnauthorizedException('Session expired');
      }
      await transaction.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          passwordChangedAt: now,
        },
      });
      await transaction.session.updateMany({
        where: { userId, id: { not: currentSessionId }, revokedAt: null },
        data: { revokedAt: now },
      });
      const rotated = await transaction.session.updateMany({
        where: { id: currentSessionId, userId, revokedAt: null },
        data: {
          reauthenticatedAt: now,
          tokenHash: this.hashCredential(credentials.token),
          csrfTokenHash: this.hashCredential(credentials.csrfToken),
        },
      });
      if (rotated.count !== 1) {
        throw new UnauthorizedException('Session expired');
      }
      await this.audit.record(
        {
          companyId,
          actorType: AuditActor.InternalUser,
          actorId: userId,
          action: AuditAction.PasswordChange,
          outcome: AuditResult.Succeeded,
          targetType: 'user',
          targetId: userId,
          ...auditContext,
        },
        transaction,
      );
      return currentSession.expiresAt;
    });
    return {
      ...credentials,
      cookieMaxAge: Math.max(0, expiresAt.getTime() - now.getTime()),
    };
  }

  async reauthenticate(
    userId: string,
    companyId: string,
    sessionId: string,
    password: string,
    auditContext: AuditRequestContext,
  ): Promise<ReauthenticationResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user || !(await argon2Verify(user.passwordHash, password))) {
      await this.audit.record({
        companyId,
        actorType: AuditActor.InternalUser,
        actorId: userId,
        action: AuditAction.Reauthentication,
        outcome: AuditResult.Failed,
        targetType: 'session',
        targetId: sessionId,
        ...auditContext,
        metadata: { reason: 'invalid_password' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const reauthenticatedAt = new Date();
    const credentials = this.createSessionCredentials();
    const expiresAt = await this.prisma.$transaction(async (transaction) => {
      const currentSession = await transaction.session.findFirst({
        where: { id: sessionId, userId, revokedAt: null },
        select: { expiresAt: true },
      });
      if (!currentSession || currentSession.expiresAt <= reauthenticatedAt) {
        throw new UnauthorizedException('Session expired');
      }
      const rotated = await transaction.session.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: {
          reauthenticatedAt,
          tokenHash: this.hashCredential(credentials.token),
          csrfTokenHash: this.hashCredential(credentials.csrfToken),
        },
      });
      if (rotated.count !== 1) {
        throw new UnauthorizedException('Session expired');
      }
      await this.audit.record(
        {
          companyId,
          actorType: AuditActor.InternalUser,
          actorId: userId,
          action: AuditAction.Reauthentication,
          outcome: AuditResult.Succeeded,
          targetType: 'session',
          targetId: sessionId,
          ...auditContext,
        },
        transaction,
      );
      return currentSession.expiresAt;
    });
    return {
      ...credentials,
      cookieMaxAge: Math.max(
        0,
        expiresAt.getTime() - reauthenticatedAt.getTime(),
      ),
      reauthenticatedUntil: new Date(
        reauthenticatedAt.getTime() +
          durationToMs(
            this.configService.get<string>('REAUTHENTICATION_TTL', '10m'),
          ),
      ),
    };
  }

  async requestPasswordReset(
    email: string,
    auditContext: AuditRequestContext,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true, status: true, companyId: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      await this.audit.record({
        companyId: user?.companyId,
        actorType: AuditActor.Anonymous,
        action: AuditAction.PasswordResetRequest,
        outcome: AuditResult.Succeeded,
        targetType: user ? 'user' : undefined,
        targetId: user?.id,
        ...auditContext,
        metadata: {
          eligible: false,
          identityHash: this.hashCredential(email.trim().toLowerCase()),
        },
      });
      return;
    }

    const token = randomBytes(32).toString('base64url');
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() +
        durationToMs(
          this.configService.get<string>('PASSWORD_RESET_TTL', '30m'),
        ),
    );
    const tokenRecord = await this.prisma.$transaction(async (transaction) => {
      await transaction.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      });
      const record = await transaction.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: createHash('sha256').update(token).digest('hex'),
          expiresAt,
        },
        select: { id: true },
      });
      await this.audit.record(
        {
          companyId: user.companyId,
          actorType: AuditActor.Anonymous,
          action: AuditAction.PasswordResetRequest,
          outcome: AuditResult.Succeeded,
          targetType: 'user',
          targetId: user.id,
          ...auditContext,
          metadata: { eligible: true },
        },
        transaction,
      );
      return record;
    });

    const resetUrl = new URL(
      this.configService.get<string>(
        'PASSWORD_RESET_URL_BASE',
        'http://localhost:3000/reset-password',
      ),
    );
    resetUrl.searchParams.set('token', token);
    const delivered =
      (await this.passwordResetDelivery?.deliver({
        recipient: user.email,
        resetUrl: resetUrl.toString(),
        expiresAt: expiresAt.toISOString(),
      })) ?? false;
    if (!delivered) {
      await this.prisma.passwordResetToken.deleteMany({
        where: { id: tokenRecord.id },
      });
    }
  }

  async resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string,
    auditContext: AuditRequestContext,
  ): Promise<void> {
    if (newPassword !== confirmPassword) {
      await this.audit.record({
        actorType: AuditActor.Anonymous,
        action: AuditAction.PasswordReset,
        outcome: AuditResult.Failed,
        ...auditContext,
        metadata: {
          reason: 'password_mismatch',
          subjectHash: this.hashCredential(token),
        },
      });
      throw new BadRequestException('Passwords do not match');
    }
    const now = new Date();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const passwordHash = await argon2Hash(newPassword);

    try {
      await this.prisma.$transaction(async (transaction) => {
        const record = await transaction.passwordResetToken.findUnique({
          where: { tokenHash },
          select: {
            id: true,
            userId: true,
            expiresAt: true,
            usedAt: true,
            user: { select: { status: true, companyId: true } },
          },
        });
        if (
          !record ||
          record.usedAt ||
          record.expiresAt <= now ||
          record.user.status !== 'ACTIVE'
        ) {
          throw new BadRequestException('Invalid password reset token');
        }
        const consumed = await transaction.passwordResetToken.updateMany({
          where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
          data: { usedAt: now },
        });
        if (consumed.count !== 1) {
          throw new BadRequestException('Invalid password reset token');
        }
        await transaction.user.update({
          where: { id: record.userId },
          data: { passwordHash, passwordChangedAt: now },
        });
        await transaction.session.updateMany({
          where: { userId: record.userId, revokedAt: null },
          data: { revokedAt: now },
        });
        await this.audit.record(
          {
            companyId: record.user.companyId,
            actorType: AuditActor.Anonymous,
            action: AuditAction.PasswordReset,
            outcome: AuditResult.Succeeded,
            targetType: 'user',
            targetId: record.userId,
            ...auditContext,
          },
          transaction,
        );
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        await this.audit.record({
          actorType: AuditActor.Anonymous,
          action: AuditAction.PasswordReset,
          outcome: AuditResult.Failed,
          ...auditContext,
          metadata: {
            reason: 'invalid_or_expired',
            subjectHash: tokenHash,
          },
        });
      }
      throw error;
    }
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
    database: SessionDatabase = this.prisma,
  ): Promise<BuiltAuthSession> {
    const { token, csrfToken } = this.createSessionCredentials();
    const cookieMaxAge = durationToMs(
      this.configService.get<string>('SESSION_ABSOLUTE_TTL', '12h'),
    );
    const now = new Date();
    const maximumSessions = Number(
      this.configService.get<string>('SESSION_MAX_PER_USER', '5'),
    );
    const activeSessions = await database.session.findMany({
      where: { userId: user.id, revokedAt: null },
      select: { id: true },
      orderBy: { lastUsedAt: 'asc' },
    });
    const overflow = activeSessions.length - maximumSessions + 1;
    const sessionsToRevoke =
      overflow > 0 ? activeSessions.slice(0, overflow) : [];
    if (sessionsToRevoke.length > 0) {
      await database.session.updateMany({
        where: { id: { in: sessionsToRevoke.map((session) => session.id) } },
        data: { revokedAt: now },
      });
    }
    const createdSession = await database.session.create({
      data: {
        userId: user.id,
        tokenHash: this.hashCredential(token),
        csrfTokenHash: this.hashCredential(csrfToken),
        reauthenticatedAt: now,
        idleExpiresAt: new Date(
          now.getTime() +
            durationToMs(
              this.configService.get<string>('SESSION_IDLE_TTL', '30m'),
            ),
        ),
        expiresAt: new Date(now.getTime() + cookieMaxAge),
      },
      select: { id: true },
    });

    const company = await database.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: { locale: true, timeZone: true, currency: true },
    });
    return {
      user: toAuthUser(user, company),
      token,
      csrfToken,
      cookieMaxAge,
      sessionId: createdSession.id,
      revokedSessionCount: sessionsToRevoke.length,
    };
  }

  private createSessionCredentials(): Pick<
    RotatedSessionCredentials,
    'token' | 'csrfToken'
  > {
    return {
      token: randomBytes(32).toString('base64url'),
      csrfToken: randomBytes(32).toString('base64url'),
    };
  }

  private hashCredential(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
