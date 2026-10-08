import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { PERMISSION_CATALOG } from '@geedyx/contracts';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '../.env') });

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://geedyx:geedyx@localhost:5432/geedyx?schema=public',
});
const prisma = new PrismaClient({ adapter });

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

    for (const permission of PERMISSION_CATALOG) {
      await prisma.permission.upsert({
        where: {
          code: permission.code,
        },
        update: {
          description: permission.description,
        },
        create: {
          code: permission.code,
          description: permission.description,
        },
      });
    }

    console.log('Geedyx database seeded. Installation is PENDING.');
  } finally {
    await prisma.$disconnect();
  }
}

await main();
