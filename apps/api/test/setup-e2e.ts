const databaseUrl = process.env.E2E_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('E2E_DATABASE_URL is required for e2e tests');
}

if (databaseUrl === process.env.DATABASE_URL) {
  throw new Error('E2E_DATABASE_URL must not match DATABASE_URL');
}

process.env.DATABASE_URL = databaseUrl;
