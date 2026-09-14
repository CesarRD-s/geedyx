import { describe, expect, it, vi } from 'vitest';
import { WebhookService } from './webhook.service.js';

describe('WebhookService', () => {
  it('lists endpoint metadata without selecting secrets', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new WebhookService(
      {
        webhookEndpoint: {
          findMany,
        },
      } as never,
      {} as never,
      {} as never,
    );

    await expect(service.findAll('company')).resolves.toEqual([]);

    expect(findMany).toHaveBeenCalledWith({
      where: { companyId: 'company' },
      select: {
        id: true,
        url: true,
        eventTypes: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  });
});
