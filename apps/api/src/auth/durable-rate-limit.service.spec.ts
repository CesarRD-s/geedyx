import { ThrottlerException } from '@nestjs/throttler';
import { describe, expect, it, vi } from 'vitest';
import { DurableRateLimitService } from './durable-rate-limit.service.js';

describe('DurableRateLimitService', () => {
  it('hashes subjects before persisting a counter', async () => {
    const upsert = vi.fn().mockResolvedValue({
      totalHits: 1,
      blockedUntil: null,
    });
    const service = new DurableRateLimitService(
      {
        rateLimitBucket: { deleteMany: vi.fn(), upsert, update: vi.fn() },
      } as never,
      { get: vi.fn((_key: string, fallback: unknown) => fallback) } as never,
    );

    await service.consume('login', ['ip:127.0.0.1']);

    const create = upsert.mock.calls[0][0].create as {
      keyHash: string;
    };
    expect(create.keyHash).toHaveLength(64);
    expect(create.keyHash).not.toContain('127.0.0.1');
  });

  it('persists a block and rejects the request beyond the limit', async () => {
    const update = vi.fn();
    const service = new DurableRateLimitService(
      {
        rateLimitBucket: {
          deleteMany: vi.fn(),
          upsert: vi.fn().mockResolvedValue({
            totalHits: 6,
            blockedUntil: null,
          }),
          update,
        },
      } as never,
      {
        get: vi.fn((key: string, fallback: unknown) =>
          key === 'AUTH_RATE_LIMIT_ATTEMPTS' ? 5 : fallback,
        ),
      } as never,
    );

    await expect(
      service.consume('login', ['identity:user']),
    ).rejects.toBeInstanceOf(ThrottlerException);
    expect(update).toHaveBeenCalledOnce();
  });
});
