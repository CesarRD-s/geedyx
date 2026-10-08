import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { ConfigurationService } from './configuration.service';

describe('ConfigurationService timezone validation', () => {
  it('rejects an invalid global timezone before writing configuration', async () => {
    const prisma = {
      $transaction: vi.fn(),
      user: {
        findUnique: vi.fn().mockResolvedValue({
          company: { id: 'company-1' },
        }),
      },
    };
    const service = new ConfigurationService(prisma as unknown as PrismaService);

    await expect(
      service.updateConfiguration(
        'owner-1',
        { timeZone: 'Not/A-Timezone' },
        'request-1',
      ),
    ).rejects.toMatchObject({
      response: { code: 'INVALID_TIME_ZONE' },
      status: 400,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
