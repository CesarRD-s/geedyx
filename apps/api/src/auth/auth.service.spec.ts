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
