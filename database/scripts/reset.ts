import { execFileSync } from 'node:child_process';

if (process.env.NODE_ENV !== 'development') {
  throw new Error('db:reset solo está permitido con NODE_ENV=development.');
}

if (process.env.GEEDYX_CONFIRM_DB_RESET !== 'YES') {
  throw new Error('db:reset requiere GEEDYX_CONFIRM_DB_RESET=YES.');
}

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
execFileSync(
  command,
  ['exec', 'prisma', 'migrate', 'reset', '--force', '--schema', 'prisma/schema.prisma'],
  {
    stdio: 'inherit',
    env: process.env,
  },
);
