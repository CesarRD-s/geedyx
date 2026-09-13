import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

function createService(installation: { id: string } | null): {
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
    service: new AuthService(prisma, config),
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
    const { service, transaction } = createService({ id: 'singleton' });

    await expect(
      service.setup({
        username: 'owner',
        email: 'owner@example.com',
        password: 'correct-horse-battery-staple',
        confirmPassword: 'correct-horse-battery-staple',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe('AuthService personal preferences', () => {
  it('persists explicit inheritance without overwriting omitted preferences', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'user-1' });
    const prisma = { user: { update } } as unknown as PrismaService;
    const service = new AuthService(prisma, new ConfigService());
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

describe('AuthService session capacity', () => {
  it('does not revoke existing sessions while capacity remains', async () => {
    const activeSession = { id: 'existing-session' };
    const updateMany = vi.fn();
    const create = vi.fn();
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
    const service = new AuthService(prisma, config);
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
        findMany: vi.fn().mockResolvedValue([
          { id: 'oldest' },
          { id: 'middle' },
          { id: 'newest' },
        ]),
        updateMany,
        create: vi.fn(),
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
    const service = new AuthService(prisma, config);

    await service['buildSession']({
      id: 'user-1', username: 'admin', email: 'admin@geedyx.test',
      companyId: 'company-1', displayName: null, locale: null, timeZone: null,
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
    const service = new AuthService(prisma, new ConfigService());

    const result = await service.reauthenticate(
      'user-1',
      'session-1',
      password,
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
    const delivery = { deliver: vi.fn().mockResolvedValue(true) };
    const service = new AuthService(prisma, config, delivery as never);

    await service.requestPasswordReset(' ADMIN@geedyx.test ');

    const resetUrl = new URL(delivery.deliver.mock.calls[0][0].resetUrl);
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
    const delivery = { deliver: vi.fn() };
    const service = new AuthService(
      prisma,
      new ConfigService(),
      delivery as never,
    );

    await expect(
      service.requestPasswordReset('missing@example.com'),
    ).resolves.toBeUndefined();
    expect(delivery.deliver).not.toHaveBeenCalled();
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
          user: { status: 'ACTIVE' },
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
    const service = new AuthService(prisma, new ConfigService());

    await service.resetPassword(
      'one-time-token',
      'new-password-value',
      'new-password-value',
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
