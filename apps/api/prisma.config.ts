// Prisma CLI configuration.
// The database connection URL lives here, not in the schema.
// Local .env is loaded through dotenv so DATABASE_URL is available to the CLI.
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});