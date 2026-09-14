import argon2 from 'argon2';
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { IntegrationAuthService } from './integration-auth.service.js';

describe('IntegrationAuthService', () => {
  it('authenticates an active client and records its use', async () => {
    const update = vi.fn();
    const service = new IntegrationAuthService({
      integrationClient: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            id: 'client',
            companyId: 'company',
            scopes: ['catalog.read'],
            secretHash: await argon2.hash('secret'),
            revokedAt: null,
            expiresAt: null,
          }),
        update,
      },
    } as never);
    await expect(service.authenticate('gxc_client', 'secret')).resolves.toEqual(
      { id: 'client', companyId: 'company', scopes: ['catalog.read'] },
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'client' } }),
    );
  });

  it('rejects a revoked client without recording use', async () => {
    const update = vi.fn();
    const service = new IntegrationAuthService({
      integrationClient: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            id: 'client',
            companyId: 'company',
            scopes: [],
            secretHash: await argon2.hash('secret'),
            revokedAt: new Date(),
            expiresAt: null,
          }),
        update,
      },
    } as never);
    await expect(
      service.authenticate('gxc_client', 'secret'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(update).not.toHaveBeenCalled();
  });
});
