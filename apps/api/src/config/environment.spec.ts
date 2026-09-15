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

  it('requires Resend configuration in production', () => {
    expect(() =>
      validateEnvironment({
        ...VALID_ENVIRONMENT,
        NODE_ENV: 'production',
      }),
    ).toThrow('EMAIL_PROVIDER');
    expect(() =>
      validateEnvironment({
        ...VALID_ENVIRONMENT,
        NODE_ENV: 'production',
        EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test',
        EMAIL_FROM: 'security@geedyx.test',
      }),
    ).toThrow('PASSWORD_RESET_URL_BASE');
  });

  it('rejects an invalid transactional email sender', () => {
    expect(() =>
      validateEnvironment({
        ...VALID_ENVIRONMENT,
        EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test',
        EMAIL_FROM: 'not-an-email',
      }),
    ).toThrow('EMAIL_FROM');
  });

  it('requires complete S3 storage configuration when selected', () => {
    expect(() =>
      validateEnvironment({
        ...VALID_ENVIRONMENT,
        FILE_STORAGE_PROVIDER: 's3',
      }),
    ).toThrow('S3_ENDPOINT');
  });

  it('requires private production file storage and a signing secret', () => {
    expect(() =>
      validateEnvironment({
        ...VALID_ENVIRONMENT,
        NODE_ENV: 'production',
        EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test',
        EMAIL_FROM: 'security@geedyx.test',
        PASSWORD_RESET_URL_BASE: 'https://app.example/reset-password',
        INVITATION_URL_BASE: 'https://app.example/accept-invitation',
        EMAIL_CHANGE_URL_BASE: 'https://app.example/confirm-email-change',
        WEBHOOK_ENCRYPTION_KEY: 'MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=',
      }),
    ).toThrow('FILE_STORAGE_PROVIDER');
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
        EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test',
        EMAIL_FROM: 'security@geedyx.test',
        PASSWORD_RESET_URL_BASE: 'https://app.example/reset-password',
        INVITATION_URL_BASE: 'https://app.example/accept-invitation',
        EMAIL_CHANGE_URL_BASE: 'https://app.example/confirm-email-change',
        FILE_STORAGE_PROVIDER: 's3',
        FILE_URL_SIGNING_SECRET: '12345678901234567890123456789012',
        S3_ENDPOINT: 'https://storage.example',
        S3_REGION: 'us-east-1',
        S3_BUCKET: 'geedyx-private',
        S3_ACCESS_KEY_ID: 'key',
        S3_SECRET_ACCESS_KEY: 'secret',
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
