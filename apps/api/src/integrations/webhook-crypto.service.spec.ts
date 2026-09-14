import { describe, expect, it } from 'vitest';
import { WebhookCryptoService } from './webhook-crypto.service.js';

describe('WebhookCryptoService', () => {
  const service = new WebhookCryptoService({
    get: () => Buffer.alloc(32, 7).toString('base64'),
  } as never);
  it('round-trips encrypted secrets and verifies HMAC signatures', () => {
    const encrypted = service.encrypt('secret');
    expect(service.decrypt(encrypted)).toBe('secret');
    const signature = service.sign('1700000000', '{"id":"event"}', 'secret');
    expect(
      service.verify('1700000000', '{"id":"event"}', signature, 'secret'),
    ).toBe(true);
    expect(
      service.verify('1700000001', '{"id":"event"}', signature, 'secret'),
    ).toBe(false);
  });
});
