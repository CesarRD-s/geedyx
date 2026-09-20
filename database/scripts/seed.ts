import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '../.env') });

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://geedyx:geedyx@localhost:5432/geedyx?schema=public',
});
const prisma = new PrismaClient({ adapter });

const permissionCodes = [
  'dashboard.read',
  'configuration.read',
  'configuration.update',
  'configuration.reset',
  'users.read',
  'users.manage',
  'roles.manage',
  'sessions.read',
  'sessions.revoke',
  'products.read',
  'products.manage',
  'products.prices.manage',
  'inventory.read',
  'inventory.receive',
  'inventory.adjust',
  'inventory.threshold.update',
  'customers.read',
  'customers.manage',
  'suppliers.read',
  'suppliers.manage',
  'sales.read',
  'sales.create',
  'sales.cancel',
  'sales.return',
  'payments.read',
  'payments.confirm',
  'reports.read',
  'audit.read',
  'system_health.read',
];

async function main(): Promise<void> {
  try {
    await prisma.installation.upsert({
      where: {
        key: 'default',
      },
      update: {},
      create: {
        key: 'default',
        status: 'PENDING',
      },
    });

    for (const code of permissionCodes) {
      await prisma.permission.upsert({
        where: {
          code,
        },
        update: {},
        create: {
          code,
        },
      });
    }

    console.log('Geedyx database seeded. Installation is PENDING.');
  } finally {
    await prisma.$disconnect();
  }
}

await main();
