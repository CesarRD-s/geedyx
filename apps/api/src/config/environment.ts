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
    throw new Error(
      `${key} must be an integer between ${minimum} and ${maximum}`,
    );
  }
  return parsed;
}

function durationValue(
  environment: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = String(environment[key] ?? fallback).trim();
  if (!/^([1-9]\d*)\s*(s|m|h|d)$/i.test(value)) {
    throw new Error(`${key} must use a positive duration such as 30m or 12h`);
  }
  return value;
}

function httpUrlValue(
  environment: Record<string, unknown>,
  key: string,
  fallback?: string,
): string | undefined {
  const rawValue = environment[key] ?? fallback;
  if (rawValue === undefined || rawValue === '') {
    return undefined;
  }
  const value = String(rawValue).trim();
  const parsed = new URL(value);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${key} must use http or https`);
  }
  return value;
}

function webhookEncryptionKeyValue(
  environment: Record<string, unknown>,
): string | undefined {
  const rawValue = environment.WEBHOOK_ENCRYPTION_KEY;
  if (rawValue === undefined || rawValue === '') {
    if (environment.NODE_ENV === 'production') {
      throw new Error('WEBHOOK_ENCRYPTION_KEY is required in production');
    }
    return undefined;
  }
  const value = String(rawValue).trim();
  if (Buffer.from(value, 'base64').length !== 32) {
    throw new Error('WEBHOOK_ENCRYPTION_KEY must be a base64 256-bit key');
  }
  return value;
}

function validateOrigins(rawOrigins: string): string {
  const origins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0) {
    throw new Error('CORS_ORIGINS must contain at least one origin');
  }
  for (const origin of origins) {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(
        `CORS_ORIGINS contains an unsupported protocol: ${origin}`,
      );
    }
    if (parsed.origin !== origin) {
      throw new Error(
        `CORS_ORIGINS entries must be origins without paths: ${origin}`,
      );
    }
  }
  return origins.join(',');
}

function emailProviderValue(
  environment: Record<string, unknown>,
): 'disabled' | 'resend' {
  const value = String(environment.EMAIL_PROVIDER ?? 'disabled')
    .trim()
    .toLowerCase();
  if (value !== 'disabled' && value !== 'resend') {
    throw new Error('EMAIL_PROVIDER must be disabled or resend');
  }
  if (environment.NODE_ENV === 'production' && value !== 'resend') {
    throw new Error('EMAIL_PROVIDER must be resend in production');
  }
  return value;
}

function fileStorageProviderValue(
  environment: Record<string, unknown>,
): 'local' | 's3' {
  const value = String(environment.FILE_STORAGE_PROVIDER ?? 'local')
    .trim()
    .toLowerCase();
  if (value !== 'local' && value !== 's3') {
    throw new Error('FILE_STORAGE_PROVIDER must be local or s3');
  }
  return value;
}

function optionalSecret(
  environment: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = environment[key];
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined;
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const passwordResetUrlBase = httpUrlValue(
    environment,
    'PASSWORD_RESET_URL_BASE',
    'http://localhost:3000/reset-password',
  );
  const emailProvider = emailProviderValue(environment);
  const fileStorageProvider = fileStorageProviderValue(environment);
  const resendApiKey = optionalSecret(environment, 'RESEND_API_KEY');
  const emailFrom = optionalSecret(environment, 'EMAIL_FROM');
  const fileUrlSigningSecret = optionalSecret(
    environment,
    'FILE_URL_SIGNING_SECRET',
  );
  if (emailProvider === 'resend' && !resendApiKey) {
    throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER is resend');
  }
  if (emailProvider === 'resend' && !emailFrom) {
    throw new Error('EMAIL_FROM is required when EMAIL_PROVIDER is resend');
  }
  if (
    emailProvider === 'resend' &&
    (!emailFrom ||
      /[\r\n]/.test(emailFrom) ||
      !/[^\s@]+@[^\s@]+\.[^\s@]+/.test(emailFrom))
  ) {
    throw new Error('EMAIL_FROM must contain a valid sender address');
  }
  const s3Endpoint = httpUrlValue(environment, 'S3_ENDPOINT');
  const s3Region = optionalSecret(environment, 'S3_REGION');
  const s3Bucket = optionalSecret(environment, 'S3_BUCKET');
  const s3AccessKeyId = optionalSecret(environment, 'S3_ACCESS_KEY_ID');
  const s3SecretAccessKey = optionalSecret(environment, 'S3_SECRET_ACCESS_KEY');
  if (
    environment.NODE_ENV === 'production' &&
    !passwordResetUrlBase?.startsWith('https://')
  ) {
    throw new Error('PASSWORD_RESET_URL_BASE must use https in production');
  }
  const invitationUrlBase = httpUrlValue(
    environment,
    'INVITATION_URL_BASE',
    'http://localhost:3000/accept-invitation',
  );
  const emailChangeUrlBase = httpUrlValue(
    environment,
    'EMAIL_CHANGE_URL_BASE',
    'http://localhost:3000/confirm-email-change',
  );
  if (
    environment.NODE_ENV === 'production' &&
    (!invitationUrlBase?.startsWith('https://') ||
      !emailChangeUrlBase?.startsWith('https://'))
  ) {
    throw new Error('Invitation and email change URLs must use https in production');
  }
  const webhookEncryptionKey = webhookEncryptionKeyValue(environment);
  if (environment.NODE_ENV === 'production' && fileStorageProvider !== 's3') {
    throw new Error('FILE_STORAGE_PROVIDER must be s3 in production');
  }
  if (
    environment.NODE_ENV === 'production' &&
    (!fileUrlSigningSecret || fileUrlSigningSecret.length < 32)
  ) {
    throw new Error(
      'FILE_URL_SIGNING_SECRET must contain at least 32 characters in production',
    );
  }
  if (
    fileStorageProvider === 's3' &&
    (!s3Endpoint ||
      !s3Region ||
      !s3Bucket ||
      !s3AccessKeyId ||
      !s3SecretAccessKey)
  ) {
    throw new Error(
      'S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required when FILE_STORAGE_PROVIDER is s3',
    );
  }
  return {
    ...environment,
    DATABASE_URL: requiredString(environment, 'DATABASE_URL'),
    SESSION_IDLE_TTL: durationValue(environment, 'SESSION_IDLE_TTL', '30m'),
    SESSION_ABSOLUTE_TTL: durationValue(
      environment,
      'SESSION_ABSOLUTE_TTL',
      '12h',
    ),
    SESSION_MAX_PER_USER: integerValue(
      environment,
      'SESSION_MAX_PER_USER',
      5,
      1,
      20,
    ),
    REAUTHENTICATION_TTL: durationValue(
      environment,
      'REAUTHENTICATION_TTL',
      '10m',
    ),
    PASSWORD_RESET_TTL: durationValue(environment, 'PASSWORD_RESET_TTL', '30m'),
    PASSWORD_RESET_URL_BASE: passwordResetUrlBase,
    INVITATION_TTL: durationValue(environment, 'INVITATION_TTL', '7d'),
    INVITATION_URL_BASE: invitationUrlBase,
    EMAIL_CHANGE_TTL: durationValue(environment, 'EMAIL_CHANGE_TTL', '30m'),
    EMAIL_CHANGE_URL_BASE: emailChangeUrlBase,
    EMAIL_PROVIDER: emailProvider,
    RESEND_API_KEY: resendApiKey,
    EMAIL_FROM: emailFrom,
    EMAIL_DELIVERY_MAX_ATTEMPTS: integerValue(
      environment,
      'EMAIL_DELIVERY_MAX_ATTEMPTS',
      2,
      1,
      3,
    ),
    FILE_STORAGE_PROVIDER: fileStorageProvider,
    UPLOAD_DIR:
      typeof environment.UPLOAD_DIR === 'string' &&
      environment.UPLOAD_DIR.trim() !== ''
        ? environment.UPLOAD_DIR.trim()
        : 'uploads',
    FILE_URL_TTL: durationValue(environment, 'FILE_URL_TTL', '10m'),
    FILE_URL_SIGNING_SECRET:
      fileUrlSigningSecret ?? 'development-only-file-url-signing-secret',
    S3_ENDPOINT: s3Endpoint,
    S3_REGION: s3Region,
    S3_BUCKET: s3Bucket,
    S3_ACCESS_KEY_ID: s3AccessKeyId,
    S3_SECRET_ACCESS_KEY: s3SecretAccessKey,
    WEBHOOK_ENCRYPTION_KEY: webhookEncryptionKey,
    AUTH_RATE_LIMIT_ATTEMPTS: integerValue(
      environment,
      'AUTH_RATE_LIMIT_ATTEMPTS',
      5,
      1,
      100,
    ),
    AUTH_RATE_LIMIT_WINDOW: durationValue(
      environment,
      'AUTH_RATE_LIMIT_WINDOW',
      '1m',
    ),
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
