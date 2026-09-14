import { describe, expect, it, vi } from 'vitest';
import { InboundWebhookService } from './inbound-webhook.service.js';

describe('InboundWebhookService', () => {
  it('returns false when the provider event was already reserved', async () => {
    const service = new InboundWebhookService({
      inboundWebhookEvent: {
        create: vi.fn().mockRejectedValue({ code: 'P2002' }),
      },
    } as never);
    await expect(service.reserve('provider', 'event')).resolves.toBe(false);
  });
});
