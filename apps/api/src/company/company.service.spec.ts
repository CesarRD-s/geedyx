import { describe, expect, it, vi } from 'vitest';
import { CompanyService } from './company.service.js';

describe('CompanyService', () => {
  it('marks configuration complete when a setting is supplied', async () => {
    const update = vi.fn().mockResolvedValue({ name: 'GEEDYX' });
    const service = new CompanyService({ company: { update } } as never);

    await service.update('company-1', { name: 'GEEDYX', locale: 'es' });

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
  });
});
