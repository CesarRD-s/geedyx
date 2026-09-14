import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { IntegrationsService } from './integrations.service.js';

describe('IntegrationsService', () => {
  const context = {
    requestId: 'request',
  };

  it('rejects a scope that is not declared for integrations', async () => {
    const service = new IntegrationsService(
      {} as never,
      {} as never,
    );

    await expect(
      service.create(
        'company',
        'user',
        {
          name: 'Store connector',
          scopes: ['admin.write'],
        },
        context,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an expiration in the past before writing a credential', async () => {
    const integrationClient = {
      create: vi.fn(),
    };
    const service = new IntegrationsService(
      {
        integrationClient,
      } as never,
      {} as never,
    );

    await expect(
      service.create(
        'company',
        'user',
        {
          name: 'Store connector',
          scopes: ['catalog.read'],
          expiresAt: new Date('2020-01-01T00:00:00.000Z'),
        },
        context,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(integrationClient.create).not.toHaveBeenCalled();
  });
});
