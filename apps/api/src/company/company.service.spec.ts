import { describe, expect, it, vi } from 'vitest';
import { CompanyService } from './company.service.js';

describe('CompanyService', () => {
  it('marks configuration complete when a setting is supplied', async () => {
    const update = vi.fn().mockResolvedValue({ name: 'GEEDYX' });
    const audit = { record: vi.fn().mockResolvedValue({}) };
    const service = new CompanyService(
      {
        $transaction: (callback: (transaction: unknown) => unknown) =>
          callback({ company: { update } }),
      } as never,
      audit as never,
    );

    await service.update(
      'company-1',
      'user-1',
      { name: 'GEEDYX', locale: 'es' },
      { requestId: 'request-1' },
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'company-1' },
        data: expect.objectContaining({
          name: 'GEEDYX',
          locale: 'es',
          configuredAt: expect.any(Date),
        }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'company.settings.update',
        outcome: 'SUCCEEDED',
        metadata: { changedFieldCount: 2 },
      }),
      expect.anything(),
    );
  });
});
