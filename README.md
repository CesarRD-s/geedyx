<p align="center">
  <img src="apps/web/src/assets/geedyx-logo-horizontal-dark.png" alt="GEEDYX" width="360" />
</p>

# GEEDYX

GEEDYX is a private, single-company ERP under development. It will manage the
business behind an external store: catalog, inventory, customers, orders,
payments, invoices, finance and reports. It is not a storefront and it is not a
multi-tenant SaaS product.

An external store, mobile application or commerce platform will integrate with
GEEDYX through a versioned API and signed webhooks. The admin console and the
API remain private operational tools.

## Current state

The repository contains a prototype foundation, not the final ERP platform:

- Next.js private admin console and NestJS API;
- PostgreSQL and Prisma;
- prototype bootstrap/login using Argon2id and a JWT cookie;
- category and product CRUD, simple stock values and local image uploads;
- a basic administration dashboard.

The active milestone is the secure platform foundation: atomic installation,
company configuration, internal users, persistent sessions, authorization,
auditability, API versioning, integration credentials and file storage. See the
[roadmap](docs/ROADMAP.md).

## Architecture

```text
Admin browser ──> Next.js admin ──> NestJS API ──> PostgreSQL
Store backend ── scoped API credential ──> NestJS API
External provider ── signed webhook ──> NestJS API
```

Next.js never accesses PostgreSQL. NestJS owns every business rule and all
database access.

## Local development

Prerequisites: Node.js 20.9+, pnpm 9+ and Docker.

```bash
pnpm install
pnpm docker:up
pnpm db:migrate:deploy
pnpm db:generate
pnpm dev
```

Copy `apps/api/.env.example` to `apps/api/.env` and
`apps/web/.env.example` to `apps/web/.env.local` before running the services.
The prototype API requires a non-empty `JWT_SECRET`.

Maintained endpoints use the `/api/v1` prefix. In development,
`OPENAPI_ENABLED=true` exposes Swagger UI at `http://localhost:3001/api/docs`;
liveness and readiness are available at `/api/v1/health/live` and
`/api/v1/health/ready`.

The first-run screen is available at `/setup`. It creates the company and its
initial owner only when the API is not installed. Set a distinct
`INSTALLATION_SECRET` in `apps/api/.env` and enter it once in the form; it is
never exposed to the frontend configuration or returned by the API.

## Validation

```bash
pnpm lint
pnpm test:api
pnpm build
```

Current e2e tests use a real configured PostgreSQL database. Do not run them
against a database containing work you need to keep; Phase 1 will provide an
isolated test database.

## Documentation

- [Current status](docs/STATUS.md)
- [Roadmap](docs/ROADMAP.md)
- [Product scope](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [API policy](docs/API.md)
- [Integration policy](docs/INTEGRATIONS.md)
- [Security](docs/SECURITY.md)
- [Architectural decisions](docs/DECISIONS.md)
- [UI contract](docs/UI.md)
- [Development rules](AGENTS.md)
