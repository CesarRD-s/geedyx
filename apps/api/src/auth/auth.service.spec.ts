import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
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
