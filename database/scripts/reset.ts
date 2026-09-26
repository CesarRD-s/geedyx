import { execFileSync } from 'node:child_process';

if (process.env.NODE_ENV !== 'development') {
  throw new Error('db:reset solo está permitido con NODE_ENV=development.');
}

if (process.env.GEEDYX_CONFIRM_DB_RESET !== 'YES') {
  throw new Error('db:reset requiere GEEDYX_CONFIRM_DB_RESET=YES.');
}

const prismaArgs = [
  'exec',
  'prisma',
  'migrate',
  'reset',
  '--force',
  '--schema',
  'prisma/schema.prisma',
];
const command = process.platform === 'win32' ? process.env.ComSpec : 'pnpm';
const commandArgs =
  process.platform === 'win32' ? ['/d', '/s', '/c', 'pnpm', ...prismaArgs] : prismaArgs;

execFileSync(command ?? 'cmd.exe', commandArgs, {
  stdio: 'inherit',
  env: process.env,
});
