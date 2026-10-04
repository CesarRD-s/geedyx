import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { AppEnvironment } from '../config/environment';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto';

function createService(prisma: object): AuthService {
  return new AuthService(
    prisma as PrismaService,
    {} as ConfigService<AppEnvironment, true>,
  );
}

describe('AuthService preferences', () => {
  it('persists overrides and returns effective values with an audit event', async () => {
    const currentUser = {
      companyId: 'company-1',
      language: null,
      timeZone: null,
      company: {
        locale: 'en',
        timeZone: 'UTC',
      },
    };
    const tx = {
      auditEvent: {
        create: vi.fn().mockResolvedValue(undefined),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(currentUser),
        update: vi.fn().mockResolvedValue(undefined),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = createService(prisma);

    await expect(
      service.updatePreferences(
        'user-1',
        {
          language: 'es',
          timeZone: 'America/Tegucigalpa',
        } as UpdatePreferencesDto,
        'request-1',
      ),
    ).resolves.toMatchObject({
      companyLanguage: 'en',
      effectiveLanguage: 'es',
      effectiveTimeZone: 'America/Tegucigalpa',
      language: 'es',
      timeZone: 'America/Tegucigalpa',
    });

    expect(tx.user.update).toHaveBeenCalledWith({
      data: {
        language: 'es',
        timeZone: 'America/Tegucigalpa',
      },
      where: { id: 'user-1' },
    });
    expect(tx.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'USER_PREFERENCES_UPDATED',
          actorUserId: 'user-1',
          module: 'configuration',
        }),
      }),
    );
  });

  it('rejects an invalid timezone before opening a transaction', async () => {
    const prisma = {
      $transaction: vi.fn(),
    };
    const service = createService(prisma);

    await expect(
      service.updatePreferences(
        'user-1',
        { language: null, timeZone: 'Not/A-Timezone' } as UpdatePreferencesDto,
        'request-1',
      ),
    ).rejects.toMatchObject({
      response: { code: 'INVALID_TIME_ZONE' },
      status: 400,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
