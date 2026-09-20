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
});
