// Development-only database tooling.
//
// Reuses the exact Prisma setup the API uses: the generated client with the
// `@prisma/adapter-pg` driver adapter (see src/prisma/prisma.service.ts).
// Not part of the API application - compiled on demand by `pnpm db:*` commands.
//
// Commands (run via the API package scripts so `.env` and the Prisma CLI are
// resolved from the API root):
//
//   pnpm db:status  → connectivity + row counts (Users/Categories/Products)
//   pnpm db:users   → list development users
//   pnpm db:reset   → drop all data and re-apply migrations (dev-only; guarded)
import 'dotenv/config';
import { execSync } from 'node:child_process';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    fail(
      'DATABASE_URL is not set. Copy apps/api/.env.example to apps/api/.env and configure it.',
    );
  }
  return url;
}

function databaseLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const name = parsed.pathname.replace(/^\//, '') || 'unknown';
    return `${name} at ${parsed.host}`;
  } catch {
    return url;
  }
}

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
  return new PrismaClient({ adapter });
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

async function cmdStatus(): Promise<void> {
  const prisma = createClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [users, categories, products] = await Promise.all([
      prisma.user.count(),
      prisma.category.count(),
      prisma.product.count(),
    ]);
    console.log(`Database: connected (${databaseLabel(getDatabaseUrl())})`);
    console.log(`Users: ${users}`);
    console.log(`Categories: ${categories}`);
    console.log(`Products: ${products}`);
  } catch (error) {
    console.error(
      `Database: connection failed (${databaseLabel(getDatabaseUrl())})`,
    );
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

async function cmdUsers(): Promise<void> {
  const prisma = createClient();
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log('GEEDYX development users');
    console.log('');

    if (users.length === 0) {
      console.log('No users found.');
      console.log('The installation is ready for /setup.');
      return;
    }

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username}`);
      console.log(`   id:      ${user.id}`);
      console.log(`   email:   ${user.email}`);
      console.log(`   created: ${formatDate(user.createdAt)}`);
      console.log(`   updated: ${formatDate(user.updatedAt)}`);
      if (index < users.length - 1) {
        console.log('');
      }
    });
  } catch (error) {
    console.error('Failed to read users.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

function cmdReset(): void {
  const url = getDatabaseUrl();
  const nodeEnv = process.env.NODE_ENV;

  if (nodeEnv === 'production') {
    fail('Aborted: refusing to reset the database when NODE_ENV=production.');
  }

  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    fail('Aborted: DATABASE_URL is not a valid PostgreSQL URL.');
  }

  if (!LOOPBACK_HOSTS.has(host)) {
    fail(
      `Aborted: DATABASE_URL points to a non-local database (host "${host}").\n` +
        'db:reset is a development-only command for local databases.',
    );
  }

  console.log('GEEDYX development database reset');
  console.log('');
  console.log(
    'WARNING: this deletes all rows in the local database and re-applies all migrations.',
  );
  console.log(`Target: ${databaseLabel(url)}`);
  console.log(
    `Guard:  NODE_ENV=${nodeEnv ?? '(unset)'}, host ${host} is loopback - safe for development.`,
  );
  console.log('');

  try {
    execSync('prisma migrate reset --force', { stdio: 'inherit' });
  } catch {
    fail('Database reset failed.');
  }

  console.log('');
  console.log('Database reset. Migrations are up to date.');
  console.log('The installation is ready for /setup.');
}

async function main(): Promise<void> {
  const command = process.argv[2];
  switch (command) {
    case 'status':
      await cmdStatus();
      break;
    case 'users':
      await cmdUsers();
      break;
    case 'reset':
      cmdReset();
      break;
    default:
      fail('Usage: node scripts/db.js <status|users|reset>');
  }
}

void main();