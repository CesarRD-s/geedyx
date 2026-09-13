import { describe, expect, it } from 'vitest';
import { validate } from 'class-validator';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdateUserDto } from '../users/dto/update-user.dto.js';
import { resolveRegionalContext } from './regional-context.js';

describe('regional context', () => {
  const company = {
    locale: 'en',
    timeZone: 'America/Tegucigalpa',
    currency: 'HNL',
  };

  it('inherits company defaults independently for each unset preference', () => {
    expect(
      resolveRegionalContext({ locale: 'es', timeZone: null }, company),
    ).toEqual({
      locale: 'es',
      timeZone: company.timeZone,
      timeZoneSource: 'company',
      companyTimeZone: company.timeZone,
      currency: 'HNL',
    });
  });

  it('uses personal display time without changing company time or currency', () => {
    expect(
      resolveRegionalContext({ locale: null, timeZone: 'UTC' }, company),
    ).toMatchObject({
      locale: 'en',
      timeZone: 'UTC',
      timeZoneSource: 'user',
      companyTimeZone: company.timeZone,
      currency: 'HNL',
    });
  });

  it('safely resolves incomplete settings and invalid legacy values', () => {
    expect(
      resolveRegionalContext(
        { locale: 'invalid', timeZone: 'invalid' },
        {
          locale: null,
          timeZone: null,
          currency: null,
        },
      ),
    ).toEqual({
      locale: 'es',
      timeZone: 'UTC',
      timeZoneSource: 'system',
      companyTimeZone: 'UTC',
      currency: null,
    });
  });

  it('accepts clearing overrides but rejects invalid time zones', async () => {
    const dto = new UpdateProfileDto();
    dto.timeZone = null;
    dto.locale = null;
    expect(await validate(dto)).toHaveLength(0);
    dto.timeZone = 'Invalid/Zone';
    expect(await validate(dto)).toHaveLength(1);
    dto.timeZone = 'America/Tegucigalpa';
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects personal preferences through user administration', async () => {
    const dto = Object.assign(new UpdateUserDto(), {
      timeZone: 'UTC',
      locale: 'es',
    });
    expect(
      await validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).toHaveLength(2);
  });
});
