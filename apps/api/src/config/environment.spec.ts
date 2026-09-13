import { validateEnvironment } from './environment.js';

const VALID_ENVIRONMENT: Record<string, unknown> = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/geedyx',
  CORS_ORIGINS: 'http://localhost:3000',
};

describe('validateEnvironment', () => {
  it('normalizes typed runtime values', () => {
    expect(
      validateEnvironment({
        ...VALID_ENVIRONMENT,
        PORT: '3101',
        COOKIE_SECURE: 'true',
        OPENAPI_ENABLED: 'false',
      }),
    ).toMatchObject({
      PORT: 3101,
      COOKIE_SECURE: true,
      OPENAPI_ENABLED: false,
      MAX_IMAGE_SIZE_MB: '5',
    });
  });

  it('rejects invalid session durations', () => {
    expect(() =>
      validateEnvironment({ ...VALID_ENVIRONMENT, SESSION_IDLE_TTL: 'never' }),
    ).toThrow('SESSION_IDLE_TTL');
    expect(() =>
      validateEnvironment({
        ...VALID_ENVIRONMENT,
        REAUTHENTICATION_TTL: 'forever',
      }),
    ).toThrow('REAUTHENTICATION_TTL');
  });

  it('rejects invalid session limits', () => {
    expect(() =>
      validateEnvironment({ ...VALID_ENVIRONMENT, SESSION_MAX_PER_USER: '0' }),
    ).toThrow('SESSION_MAX_PER_USER');
  });

  it('rejects CORS entries that contain a path', () => {
    expect(() =>
      validateEnvironment({
        ...VALID_ENVIRONMENT,
        CORS_ORIGINS: 'http://localhost:3000/app',
      }),
    ).toThrow('CORS_ORIGINS entries must be origins without paths');
  });
});
