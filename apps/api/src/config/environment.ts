const BOOLEAN_VALUES = new Set(['true', 'false']);

function requiredString(
  environment: Record<string, unknown>,
  key: string,
): string {
  const value = environment[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${key} is required`);
  }
  return value.trim();
}

function booleanValue(
  environment: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const rawValue = environment[key];
  if (rawValue === undefined || rawValue === '') {
    return fallback;
  }
  const normalized = String(rawValue).toLowerCase();
  if (!BOOLEAN_VALUES.has(normalized)) {
    throw new Error(`${key} must be true or false`);
  }
  return normalized === 'true';
}

function integerValue(
  environment: Record<string, unknown>,
  key: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const rawValue = environment[key] ?? fallback;
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${key} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function validateOrigins(rawOrigins: string): string {
  const origins = rawOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);
  if (origins.length === 0) {
    throw new Error('CORS_ORIGINS must contain at least one origin');
  }
  for (const origin of origins) {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`CORS_ORIGINS contains an unsupported protocol: ${origin}`);
    }
    if (parsed.origin !== origin) {
      throw new Error(`CORS_ORIGINS entries must be origins without paths: ${origin}`);
    }
  }
  return origins.join(',');
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const jwtSecret = requiredString(environment, 'JWT_SECRET');
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }
  const installationSecret = requiredString(environment, 'INSTALLATION_SECRET');
  if (installationSecret.length < 32) {
    throw new Error('INSTALLATION_SECRET must contain at least 32 characters');
  }

  return {
    ...environment,
    DATABASE_URL: requiredString(environment, 'DATABASE_URL'),
    JWT_SECRET: jwtSecret,
    INSTALLATION_SECRET: installationSecret,
    PORT: integerValue(environment, 'PORT', 3001, 1, 65_535),
    MAX_IMAGE_SIZE_MB: String(
      integerValue(environment, 'MAX_IMAGE_SIZE_MB', 5, 1, 25),
    ),
    CORS_ORIGINS: validateOrigins(
      typeof environment.CORS_ORIGINS === 'string'
        ? environment.CORS_ORIGINS
        : 'http://localhost:3000',
    ),
    COOKIE_SECURE: booleanValue(environment, 'COOKIE_SECURE', false),
    TRUST_PROXY: booleanValue(environment, 'TRUST_PROXY', false),
    OPENAPI_ENABLED: booleanValue(
      environment,
      'OPENAPI_ENABLED',
      environment.NODE_ENV !== 'production',
    ),
  };
}
