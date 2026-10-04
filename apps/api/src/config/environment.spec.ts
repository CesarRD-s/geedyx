import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it('applies safe development defaults', () => {
    const environment = validateEnvironment({});
    expect(environment.NODE_ENV).toBe('development');
    expect(environment.API_PORT).toBe(4000);
    expect(environment.COOKIE_SECURE).toBe(false);
  });

  it('rejects an invalid web origin', () => {
    expect(() => validateEnvironment({ WEB_ORIGIN: 'not-a-url' })).toThrow(
      /WEB_ORIGIN/,
    );
  });

  it('requires secure cookies in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        COOKIE_SECURE: false,
      }),
    ).toThrow(/COOKIE_SECURE/);

    expect(
      validateEnvironment({
        NODE_ENV: 'production',
        COOKIE_SECURE: true,
      }).COOKIE_SECURE,
    ).toBe(true);
  });
});
