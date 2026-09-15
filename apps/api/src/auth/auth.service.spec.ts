import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import {
  SystemRoleCode,
  SYSTEM_ROLE_DEFINITIONS,
} from './authorization/permissions.js';

const auditContext = { requestId: 'request-1' };

function auditStub() {
  return { record: vi.fn().mockResolvedValue({ id: 'event-1', sequence: 1n }) };
}

function createService(
  installation: { id: string; companyId: string } | null,
): {
  service: AuthService;
  transaction: ReturnType<typeof vi.fn>;
} {
  const transaction = vi.fn();
  const prisma = {
    installation: {
      findUnique: vi.fn().mockResolvedValue(installation),
    },
    $transaction: transaction,
  } as unknown as PrismaService;
  const config = {
    get: vi.fn().mockReturnValue('12h'),
  } as unknown as ConfigService;

  return {
    service: new AuthService(prisma, config, auditStub() as never),
    transaction,
  };
}

describe('AuthService installation state', () => {
  it('reports an incomplete installation when no singleton exists', async () => {
    const { service } = createService(null);

    await expect(service.getInstallationStatus()).resolves.toEqual({
      installed: false,
    });
  });

  it('blocks setup before any write when installation already exists', async () => {
    const { service, transaction } = createService({
      id: 'singleton',
      companyId: 'company-1',
    });

    await expect(
      service.setup(
        {
          username: 'owner',
          email: 'owner@example.com',
          password: 'correct-horse-battery-staple',
          confirmPassword: 'correct-horse-battery-staple',
        },
        auditContext,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('provisions every system role with its declared permissions at setup', async () => {
    const roleCreate = vi.fn(({ data }: { data: { code: string } }) => ({
      id: `role-${data.code.toLowerCase()}`,
      code: data.code,
    }));
    const transactionClient = {
      company: {
        create: vi.fn().mockResolvedValue({ id: 'company-1' }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          locale: 'es',
          timeZone: 'America/Tegucigalpa',
          currency: 'HNL',
        }),
      },
      user: {
        create: vi.fn().mockResolvedValue({
          id: 'user-1',
          username: 'owner',
          email: 'owner@example.com',
          companyId: 'company-1',
          displayName: null,
          locale: null,
          timeZone: null,
        }),
      },
      role: { create: roleCreate },
      userRole: { create: vi.fn().mockResolvedValue({}) },
      installation: { create: vi.fn().mockResolvedValue({}) },
      session: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 'session-1' }),
      },
    };
    const prisma = {
      installation: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(
        (callback: (client: typeof transactionClient) => Promise<unknown>) =>
          callback(transactionClient),
      ),
    } as unknown as PrismaService;
    const service = new AuthService(
      prisma,
      new ConfigService(),
      auditStub() as never,
    );

    await service.setup(
      {
        username: 'owner',
        email: 'owner@example.com',
        password: 'correct-horse-battery-staple',
        confirmPassword: 'correct-horse-battery-staple',
      },
      auditContext,
    );

    expect(roleCreate).toHaveBeenCalledTimes(SYSTEM_ROLE_DEFINITIONS.length);
    expect(roleCreate.mock.calls.map(([argument]) => argument.data.code)).toEqual(
      SYSTEM_ROLE_DEFINITIONS.map((role) => role.code),
    );
    expect(transactionClient.userRole.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        roleId: `role-${SystemRoleCode.Owner.toLowerCase()}`,
      },
    });
    expect(roleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: SystemRoleCode.Admin,
          permissions: {
            create: expect.arrayContaining([
              { permission: { connect: { code: 'company.manage' } } },
              { permission: { connect: { code: 'users.manage' } } },
            ]),
          },
        }),
      }),
    );
  });
});

describe('AuthService personal preferences', () => {
  it('persists explicit inheritance without overwriting omitted preferences', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'user-1' });
    const prisma = { user: { update } } as unknown as PrismaService;
    const service = new AuthService(
      prisma,
      new ConfigService(),
      auditStub() as never,
    );
    const profile = {
      id: 'user-1',
      username: 'owner',
      email: 'owner@example.com',
      companyId: 'company-1',
      displayName: null,
      locale: 'es',
      timeZone: null,
      permissions: [],
      regionalContext: {
        locale: 'es',
        timeZone: 'America/Tegucigalpa',
        timeZoneSource: 'company',
        companyTimeZone: 'America/Tegucigalpa',
        currency: 'HNL',
      },
    };
    vi.spyOn(service, 'getProfile').mockResolvedValue(profile);
    await expect(
      service.updateProfile('user-1', { timeZone: null }),
    ).resolves.toEqual(profile);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { timeZone: null },
      select: { id: true },
    });
  });
});

describe('AuthService authentication audit', () => {
  it('audits a failed login with a hashed identity and no password', async () => {
    const audit = auditStub();
    const service = new AuthService(
      {
        user: { findUnique: vi.fn().mockResolvedValue(null) },
      } as unknown as PrismaService,
      new ConfigService(),
      audit as never,
    );

    await expect(
      service.login(
        { email: 'missing@example.com', password: 'invalid-password' },
        auditContext,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const event = audit.record.mock.calls[0][0];
    expect(event.metadata.identityHash).toHaveLength(64);
    expect(JSON.stringify(event)).not.toContain('invalid-password');
    expect(JSON.stringify(event)).not.toContain('missing@example.com');
  });
});

describe('AuthService session capacity', () => {
  it('does not revoke existing sessions while capacity remains', async () => {
    const activeSession = { id: 'existing-session' };
    const updateMany = vi.fn();
    const create = vi.fn().mockResolvedValue({ id: 'new-session' });
    const prisma = {
      session: {
        findMany: vi.fn().mockResolvedValue([activeSession]),
        updateMany,
        create,
      },
      company: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          locale: 'es',
          timeZone: 'UTC',
          currency: 'HNL',
        }),
      },
    } as unknown as PrismaService;
    const config = {
      get: vi.fn((key: string, fallback: string) =>
        key === 'SESSION_MAX_PER_USER' ? '5' : fallback,
      ),
    } as unknown as ConfigService;
    const service = new AuthService(prisma, config, auditStub() as never);
    const user = {
      id: 'user-1',
      username: 'admin',
      email: 'admin@geedyx.test',
      companyId: 'company-1',
      displayName: null,
      locale: 'es',
      timeZone: 'UTC',
    };

    await service['buildSession'](user);

    expect(updateMany).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledOnce();
  });

  it('revokes only the oldest sessions that exceed the limit', async () => {
    const updateMany = vi.fn();
    const prisma = {
      session: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { id: 'oldest' },
            { id: 'middle' },
            { id: 'newest' },
          ]),
        updateMany,
        create: vi.fn().mockResolvedValue({ id: 'new-session' }),
      },
      company: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          locale: 'es',
          timeZone: 'UTC',
          currency: null,
        }),
      },
    } as unknown as PrismaService;
    const config = {
      get: vi.fn((key: string, fallback: string) =>
        key === 'SESSION_MAX_PER_USER' ? '3' : fallback,
      ),
    } as unknown as ConfigService;
    const service = new AuthService(prisma, config, auditStub() as never);

    await service['buildSession']({
      id: 'user-1',
      username: 'admin',
      email: 'admin@geedyx.test',
      companyId: 'company-1',
      displayName: null,
      locale: null,
      timeZone: null,
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['oldest'] } },
      data: { revokedAt: expect.any(Date) },
    });
  });
});

describe('AuthService session credential rotation', () => {
  it('rotates both credentials on reauthentication without extending absolute expiry', async () => {
    const password = 'current-password-value';
    const expiresAt = new Date(Date.now() + 60 * 60_000);
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const transactionClient = {
      session: {
        findFirst: vi.fn().mockResolvedValue({ expiresAt }),
        updateMany,
      },
    };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        }),
      },
      $transaction: vi.fn(
        (callback: (client: typeof transactionClient) => Promise<unknown>) =>
          callback(transactionClient),
      ),
    } as unknown as PrismaService;
    const audit = auditStub();
    const service = new AuthService(
      prisma,
      new ConfigService(),
      audit as never,
    );

    const result = await service.reauthenticate(
      'user-1',
      'company-1',
      'session-1',
      password,
      auditContext,
    );

    const rotation = updateMany.mock.calls[0][0];
    expect(rotation.where).toEqual({
      id: 'session-1',
      userId: 'user-1',
      revokedAt: null,
    });
    expect(rotation.data).not.toHaveProperty('expiresAt');
    expect(rotation.data.tokenHash).toBe(
      createHash('sha256').update(result.token).digest('hex'),
    );
    expect(rotation.data.csrfTokenHash).toBe(
      createHash('sha256').update(result.csrfToken).digest('hex'),
    );
    expect(result.cookieMaxAge).toBeGreaterThan(0);
    expect(result.cookieMaxAge).toBeLessThanOrEqual(60 * 60_000);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'authentication.reauthentication',
        outcome: 'SUCCEEDED',
      }),
      transactionClient,
    );
  });
});

describe('AuthService password recovery', () => {
  it('persists only a hash and passes the raw token through the delivery link', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'reset-1' });
    const transactionClient = {
      passwordResetToken: { updateMany: vi.fn(), create },
    };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-1',
          email: 'admin@geedyx.test',
          status: 'ACTIVE',
          companyId: 'company-1',
        }),
      },
      passwordResetToken: { deleteMany: vi.fn() },
      $transaction: vi.fn(
        (callback: (client: typeof transactionClient) => Promise<unknown>) =>
          callback(transactionClient),
      ),
    } as unknown as PrismaService;
    const config = {
      get: vi.fn((key: string, fallback: string) => fallback),
    } as unknown as ConfigService;
    const delivery = { deliverPasswordReset: vi.fn().mockResolvedValue(true) };
    const service = new AuthService(
      prisma,
      config,
      auditStub() as never,
      delivery as never,
    );

    await service.requestPasswordReset(' ADMIN@geedyx.test ', auditContext);

    const resetUrl = new URL(
      delivery.deliverPasswordReset.mock.calls[0][0].resetUrl,
    );
    const rawToken = resetUrl.searchParams.get('token');
    const storedHash = create.mock.calls[0][0].data.tokenHash as string;
    expect(rawToken).toBeTruthy();
    expect(storedHash).toHaveLength(64);
    expect(storedHash).not.toBe(rawToken);
    expect(prisma.passwordResetToken.deleteMany).not.toHaveBeenCalled();
  });

  it('does not reveal whether the requested account exists', async () => {
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(),
    } as unknown as PrismaService;
    const delivery = { deliverPasswordReset: vi.fn() };
    const service = new AuthService(
      prisma,
      new ConfigService(),
      auditStub() as never,
      delivery as never,
    );

    await expect(
      service.requestPasswordReset('missing@example.com', auditContext),
    ).resolves.toBeUndefined();
    expect(delivery.deliverPasswordReset).not.toHaveBeenCalled();
  });

  it('consumes one valid token and revokes every active session', async () => {
    const passwordResetUpdate = vi.fn().mockResolvedValue({ count: 1 });
    const userUpdate = vi.fn();
    const sessionUpdate = vi.fn();
    const transactionClient = {
      passwordResetToken: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'reset-1',
          userId: 'user-1',
          expiresAt: new Date(Date.now() + 60_000),
          usedAt: null,
          user: { status: 'ACTIVE', companyId: 'company-1' },
        }),
        updateMany: passwordResetUpdate,
      },
      user: { update: userUpdate },
      session: { updateMany: sessionUpdate },
    };
    const prisma = {
      $transaction: vi.fn(
        (callback: (client: typeof transactionClient) => Promise<unknown>) =>
          callback(transactionClient),
      ),
    } as unknown as PrismaService;
    const service = new AuthService(
      prisma,
      new ConfigService(),
      auditStub() as never,
    );

    await service.resetPassword(
      'one-time-token',
      'new-password-value',
      'new-password-value',
      auditContext,
    );

    expect(passwordResetUpdate).toHaveBeenCalledWith({
      where: {
        id: 'reset-1',
        usedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: { usedAt: expect.any(Date) },
    });
    expect(userUpdate).toHaveBeenCalledOnce();
    expect(sessionUpdate).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});

describe('AuthService invitation and email change', () => {
  it('activates an invited account after consuming its token', async () => {
    const invitationUpdate = vi.fn().mockResolvedValue({ count: 1 });
    const userUpdate = vi.fn().mockResolvedValue({});
    const transactionClient = {
      userInvitation: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'invitation-1',
          userId: 'user-1',
          acceptedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
          user: { companyId: 'company-1', status: 'INVITED' },
        }),
        updateMany: invitationUpdate,
      },
      user: { update: userUpdate },
    };
    const service = new AuthService(
      {
        $transaction: vi.fn(
          (callback: (client: typeof transactionClient) => Promise<unknown>) =>
            callback(transactionClient),
        ),
      } as unknown as PrismaService,
      new ConfigService(),
      auditStub() as never,
    );

    await service.acceptInvitation(
      'invitation-token',
      'new-password-value',
      'new-password-value',
      auditContext,
    );

    expect(invitationUpdate).toHaveBeenCalledWith({
      where: {
        id: 'invitation-1',
        acceptedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: { acceptedAt: expect.any(Date) },
    });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        status: 'ACTIVE',
        passwordHash: expect.any(String),
      }),
    });
  });

  it('confirms an email change once and revokes every active session', async () => {
    const tokenUpdate = vi.fn().mockResolvedValue({ count: 1 });
    const userUpdate = vi.fn().mockResolvedValue({});
    const sessionUpdate = vi.fn().mockResolvedValue({ count: 2 });
    const transactionClient = {
      emailChangeToken: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'change-1',
          userId: 'user-1',
          newEmail: 'new@geedyx.test',
          usedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
          user: { companyId: 'company-1', status: 'ACTIVE' },
        }),
        updateMany: tokenUpdate,
      },
      user: { update: userUpdate },
      session: { updateMany: sessionUpdate },
    };
    const service = new AuthService(
      {
        $transaction: vi.fn(
          (callback: (client: typeof transactionClient) => Promise<unknown>) =>
            callback(transactionClient),
        ),
      } as unknown as PrismaService,
      new ConfigService(),
      auditStub() as never,
    );

    await service.confirmEmailChange('change-token', auditContext);

    expect(tokenUpdate).toHaveBeenCalledWith({
      where: {
        id: 'change-1',
        usedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: { usedAt: expect.any(Date) },
    });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { email: 'new@geedyx.test' },
    });
    expect(sessionUpdate).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
