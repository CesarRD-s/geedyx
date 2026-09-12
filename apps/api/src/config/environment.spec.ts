import { validateEnvironment } from './environment.js';

const VALID_ENVIRONMENT: Record<string, unknown> = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/geedyx',
  JWT_SECRET: 'a-secure-development-secret-with-32-chars',
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

  it('rejects short authentication secrets', () => {
    expect(() =>
      validateEnvironment({ ...VALID_ENVIRONMENT, JWT_SECRET: 'short' }),
    ).toThrow('JWT_SECRET must contain at least 32 characters');
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
