import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { IdempotencyService } from './idempotency.service.js';

describe('IdempotencyService', () => {
  it('replays a completed matching request without calling the action', async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValue({
        requestHash:
          '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a',
        completedAt: new Date(),
        responseStatus: 201,
        responseBody: { id: 'order' },
      });
    const action = vi.fn();
    const service = new IdempotencyService({
      idempotencyRecord: { findUnique },
    } as never);
    await expect(
      service.execute('client', 'order.create', 'key', {}, action),
    ).resolves.toEqual({ status: 201, body: { id: 'order' } });
    expect(action).not.toHaveBeenCalled();
  });

  it('rejects a key reused with another request', async () => {
    const service = new IdempotencyService({
      idempotencyRecord: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            requestHash: 'different',
            completedAt: null,
            responseStatus: null,
            responseBody: null,
          }),
      },
    } as never);
    await expect(
      service.execute('client', 'order.create', 'key', {}, vi.fn()),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('releases a reservation when the operation fails', async () => {
    const deleteRecord = vi.fn().mockResolvedValue(undefined);
    const action = vi.fn().mockRejectedValue(new Error('upstream failure'));
    const service = new IdempotencyService({
      idempotencyRecord: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'record' }),
        delete: deleteRecord,
      },
    } as never);

    await expect(
      service.execute('client', 'order.create', 'key', {}, action),
    ).rejects.toThrow('upstream failure');

    expect(deleteRecord).toHaveBeenCalledWith({ where: { id: 'record' } });
  });
});
