import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

const INSTALLATION_SECRET = 'test-installation-secret-with-at-least-32-chars';

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
    getOrThrow: vi.fn().mockReturnValue(INSTALLATION_SECRET),
  } as unknown as ConfigService;
  const jwt = {} as JwtService;

  return {
    service: new AuthService(prisma, jwt, config),
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
        companyName: 'GEEDYX',
        username: 'owner',
        email: 'owner@example.com',
        password: 'correct-horse-battery-staple',
        installationSecret: INSTALLATION_SECRET,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  });
});
