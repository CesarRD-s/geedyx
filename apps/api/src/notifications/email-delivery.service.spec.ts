import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailDeliveryService } from './email-delivery.service.js';

const passwordReset = {
  companyId: 'company-1',
  recipient: 'admin@geedyx.test',
  resetUrl: 'http://localhost:3000/reset-password?token=secret-token',
  expiresAt: '2026-09-15T12:00:00.000Z',
};

describe('EmailDeliveryService', () => {
  it('records a suppressed local delivery without storing recipient or token', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'delivery-1' });
    const update = vi.fn().mockResolvedValue({});
    const service = new EmailDeliveryService(
      {
        emailDelivery: { create, update },
      } as unknown as PrismaService,
      new ConfigService({ EMAIL_PROVIDER: 'disabled' }),
    );

    await expect(service.deliverPasswordReset(passwordReset)).resolves.toBe(
      false,
    );

    const created = create.mock.calls[0]?.[0].data;
    expect(created.recipientHash).toHaveLength(64);
    expect(JSON.stringify(created)).not.toContain(passwordReset.recipient);
    expect(JSON.stringify(created)).not.toContain('secret-token');
    expect(update).toHaveBeenCalledWith({
      where: { id: 'delivery-1' },
      data: { status: 'SUPPRESSED', completedAt: expect.any(Date) },
    });
  });

  it('retries a failed Resend request with the same idempotency key', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'delivery-1' });
    const update = vi.fn().mockResolvedValue({});
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'resend-message-1' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchStub);
    try {
      const service = new EmailDeliveryService(
        {
          emailDelivery: { create, update },
        } as unknown as PrismaService,
        new ConfigService({
          EMAIL_PROVIDER: 'resend',
          RESEND_API_KEY: 're_test',
          EMAIL_FROM: 'security@geedyx.test',
          EMAIL_DELIVERY_MAX_ATTEMPTS: 2,
        }),
      );

      await expect(service.deliverPasswordReset(passwordReset)).resolves.toBe(
        true,
      );

      expect(fetchStub).toHaveBeenCalledTimes(2);
      expect(fetchStub.mock.calls[0]?.[1].headers).toMatchObject({
        'idempotency-key': 'geedyx-email-delivery-1',
      });
      expect(fetchStub.mock.calls[1]?.[1].headers).toMatchObject({
        'idempotency-key': 'geedyx-email-delivery-1',
      });
      expect(update).toHaveBeenCalledWith({
        where: { id: 'delivery-1' },
        data: expect.objectContaining({
          status: 'DELIVERED',
          attempts: 2,
          providerMessageId: 'resend-message-1',
        }),
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
