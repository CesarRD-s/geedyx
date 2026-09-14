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

  it('requires secure password reset delivery in production', () => {
    expect(() =>
      validateEnvironment({
        ...VALID_ENVIRONMENT,
        NODE_ENV: 'production',
      }),
    ).toThrow('PASSWORD_RESET_DELIVERY_ENDPOINT');
    expect(() =>
      validateEnvironment({
        ...VALID_ENVIRONMENT,
        NODE_ENV: 'production',
        PASSWORD_RESET_DELIVERY_ENDPOINT: 'http://notifications.example/reset',
        PASSWORD_RESET_DELIVERY_TOKEN: 'secret',
      }),
    ).toThrow('must use https');
  });

  it('validates webhook encryption keys before startup', () => {
    expect(() =>
      validateEnvironment({
        ...VALID_ENVIRONMENT,
        WEBHOOK_ENCRYPTION_KEY: 'invalid',
      }),
    ).toThrow('WEBHOOK_ENCRYPTION_KEY');
    expect(() =>
      validateEnvironment({
        ...VALID_ENVIRONMENT,
        NODE_ENV: 'production',
        PASSWORD_RESET_DELIVERY_ENDPOINT: 'https://notifications.example/reset',
        PASSWORD_RESET_DELIVERY_TOKEN: 'token',
        PASSWORD_RESET_URL_BASE: 'https://app.example/reset-password',
      }),
    ).toThrow('WEBHOOK_ENCRYPTION_KEY');
  });

  it('rejects invalid session limits', () => {
    expect(() =>
      validateEnvironment({ ...VALID_ENVIRONMENT, SESSION_MAX_PER_USER: '0' }),
    ).toThrow('SESSION_MAX_PER_USER');
  });

  it('rejects invalid durable authentication rate limits', () => {
    expect(() =>
      validateEnvironment({
        ...VALID_ENVIRONMENT,
        AUTH_RATE_LIMIT_ATTEMPTS: '0',
      }),
    ).toThrow('AUTH_RATE_LIMIT_ATTEMPTS');
    expect(() =>
      validateEnvironment({
        ...VALID_ENVIRONMENT,
        AUTH_RATE_LIMIT_WINDOW: 'none',
      }),
    ).toThrow('AUTH_RATE_LIMIT_WINDOW');
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
