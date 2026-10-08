import { config } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig, env } from 'prisma/config';

config({ path: resolve(process.cwd(), '../.env') });

const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'pnpm --filter @geedyx/database seed',
  },
  datasource: {
    url: env('DATABASE_URL'),
    ...(shadowDatabaseUrl
      ? {
          shadowDatabaseUrl,
        }
      : {}),
  },
});
