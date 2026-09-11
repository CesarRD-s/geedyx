# @geedyx/api

GEEDYX backend API.

Built with NestJS 12, TypeScript (strict), ESLint, Prettier, and Vitest.

## Development

From the repository root:

```bash
pnpm dev:api
```

The API listens on `http://localhost:3001` (`PORT` env var).

## Repository context

This application runs inside the GEEDYX pnpm workspace. See the
[repository README](../../README.md) and [docs](../../docs) for architecture,
planned API contract, and development workflow.

## Status

Default NestJS bootstrap plus the Prisma database foundation (Prisma is
configured and connected to the local Docker PostgreSQL). No business
functionality is implemented. See [docs/API.md](../../docs/API.md) for the
planned API contract and [docs/DATABASE.md](../../docs/DATABASE.md) for the
database setup.