# GEEDYX

A small but extensible product and inventory management platform with an
administration console (GEEDYX is a private admin application; there are no
public views).

## Status

**MVP complete (checkpoints 1–11).** Authentication, categories, products,
stock, product images, the administration UI, the v1 dashboard are
implemented and verified. Checkpoint 11 (hardening, UX security and release)
audited the whole system, fixed real configuration/security/UX issues and ran
the full automated and smoke suites. Checkpoint 12 (Design System) and
checkpoints 12.1–12.2 (initial setup UI, bootstrap cleanup and dev database
tooling) refined the result; the public catalog was removed as GEEDYX is a
private admin app. The only planned area left in the MVP scope is the advanced
inventory dashboard/statistics (see [docs/ROADMAP.md](./docs/ROADMAP.md)).

## Features

- **Administration** (`/admin`, login required): dashboard with real counts,
  categories CRUD and products CRUD with search, filters, sorting, pagination,
  image upload/replace/delete, stock, low-stock threshold and activate/
  deactivate.
- **Bootstrap**: the first administrator is created with `/setup` (direct
  navigation only, not linked from `/login`) and the bootstrap endpoint is
  permanently locked afterwards.
- **Security**: single administrator, Argon2id hashing, short-lived JWT in an
  HttpOnly cookie, CORS with explicit origins, rate limiting, and validated
  file uploads (MIME + magic bytes + size).

## Architecture

```text
Browser (public or admin)
        |
        v
Next.js Web  (apps/web)
        |
        | REST
        v
NestJS API  (apps/api)
        |
        v
Prisma
        |
        v
PostgreSQL  (Docker)
```

- Next.js and NestJS are separate applications; the web app never touches
  PostgreSQL directly.
- The NestJS API owns business logic, data access (Prisma) and authentication.
- Frontend/backend communication is REST over HTTP.

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) and
[docs/DECISIONS.md](./docs/DECISIONS.md).

## Repository structure

```text
geedyx/
├── apps/
│   ├── web/        Next.js application (admin console)
│   └── api/        NestJS API (auth, categories, products, images)
├── docs/           Product, architecture, API, security, UI, roadmap, decisions
├── AGENTS.md       Development rules (read while working on this repo)
├── CHANGELOG.md
├── docker-compose.yml
├── package.json
└── pnpm-workspace.yaml
```

## Prerequisites

- **Node.js 20.9 or newer** (Node 22+ recommended) — required by Next.js 16.
- **pnpm 9 or newer** (pnpm 11 recommended).
- **Docker** (for local PostgreSQL). `docker compose` must be available.

## 1. Install dependencies

```bash
pnpm install
```

## 2. Configure environment variables

Copy each example file and adjust the values:

```bash
# API — the only required* secret is JWT_SECRET
cp apps/api/.env.example apps/api/.env

# Web
cp apps/web/.env.example apps/web/.env.local
```

> \* `JWT_SECRET` must be a non-empty value. The API refuses to start when it is
> missing or empty, to avoid signing tokens with an empty secret. For production
> generate a strong random value, e.g. `openssl rand -hex 32`.

Required variables:

| App | Variable | Purpose |
| --- | -------- | ------- |
| API | `DATABASE_URL` | PostgreSQL connection string for Prisma |
| API | `JWT_SECRET` | JWT signing secret (required, non-empty) |
| API | `CORS_ORIGINS` | Allowed frontend origin(s), comma-separated (credentials enabled) |
| API | `COOKIE_SECURE` | `true` over HTTPS so the auth cookie is `Secure` |
| API | `JWT_EXPIRES_IN` | Session/token lifetime (e.g. `1h`, `12h`, `7d`) |
| API | `UPLOAD_DIR` | Directory for product images (default `uploads`) |
| API | `MAX_IMAGE_SIZE_MB` | Max product image size in MB (default `5`) |
| API | `TRUST_PROXY` | `true` when the API runs behind a reverse proxy (rate limiting uses the real client IP) |
| Web | `NEXT_PUBLIC_API_URL` | HTTP base URL of the API (e.g. `http://localhost:3001`) |

Backend secrets must never be exposed to the frontend, so the API variables are
never prefixed with `NEXT_PUBLIC_` and are never used by the web app.

## 3. Start PostgreSQL

```bash
docker compose up -d
```

PostgreSQL 17 runs on `localhost:5432` (database/user `geedyx`, default password
`change-me`, matching the default `DATABASE_URL`). The password is read by
Docker Compose from `POSTGRES_PASSWORD` (default `change-me` in
`docker-compose.yml`); set a real local secret in a repo-root `.env` (gitignored)
or the shell environment and keep `apps/api/.env` in sync. A named volume
persists the data; the container exposes a `pg_isready` healthcheck.

## 4. Apply migrations and generate Prisma

```bash
pnpm db:migrate:deploy   # apply pending migrations to the database
pnpm db:generate         # generate the Prisma client (after install/migration)
```

For development you can also use `pnpm db:migrate` to create and apply a new
migration.

## 5. Start the API

```bash
pnpm dev:api        # development (watch mode) — http://localhost:3001
# or production build:
pnpm build:api && pnpm --filter @geedyx/api start:prod
```

## 6. Create the first administrator

GEEDYX has no public registration. The first (and only) administrator is created
with the bootstrap endpoint, which works only while the `User` table is empty
and is permanently blocked afterwards (it returns `403 Forbidden` once any user
exists). The web experience is at `/setup` (direct navigation; it is not linked
from `/login`):

```bash
curl -X POST http://localhost:3001/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@example.com","password":"change-me-strong"}'
```

The password must be at least 8 characters. The response sets the session cookie,
so that administrator can open `/admin` directly.

> If you already ran the app before, the database may contain an old
> administrator. To bootstrap fresh, reset the local database first (dev only):
> `pnpm db:reset`, then run `POST /auth/setup` (or open `/setup`) again.

### Development database tools

```bash
pnpm db:status    # connectivity + Users/Categories/Products counts
pnpm db:users     # list development users
pnpm db:reset     # (dev only) wipe the local DB and re-apply all migrations
```

`db:status` confirms the connection and row counts; `db:users` lists the
development users (and prints "ready for /setup" when there are none). `db:reset`
is a development-only command: it refuses to run when `NODE_ENV=production` or
when `DATABASE_URL` does not point to a loopback host, and it reuses
`prisma migrate reset --force` to drop the local data and re-apply the
migrations.

## 7. Start the web app

```bash
pnpm dev:web         # development — http://localhost:3000
# or production build:
pnpm build:web && pnpm --filter @geedyx/web start
```

## 8. Use the product

GEEDYX is a private admin application. Opening http://localhost:3000 redirects
to `/admin` (authenticated) or `/login` (no session).

- **Administration:** open http://localhost:3000/admin (a visit without a
  session redirects to `/login`). Sign in with the bootstrap credentials, then
  manage categories and products, upload product images, adjust stock and
  activate/deactivate products.

## One-command development

With PostgreSQL running (`docker compose up -d`) you can start both dev apps:

```bash
pnpm dev        # API + Web with hot reload
```

## Tests

```bash
pnpm lint                       # eslint for web + api
pnpm build                      # production builds for api + web
pnpm test:api                   # API unit tests (vitest)
pnpm --filter @geedyx/api test:e2e   # API end-to-end tests (uses the local PostgreSQL)
```

The e2e suites run sequentially against the local development database and clean
up after themselves.

## Deployment

No specific provider is assumed; the pieces are standard Node/Postgres.

### Web (`apps/web`)

- Platform: anything that runs a Next.js server (Node 20.9+). Build with
  `pnpm --filter @geedyx/web build`, run `pnpm --filter @geedyx/web start`.
- Required variables: `NEXT_PUBLIC_API_URL` = public HTTPS URL of the API.

### API (`apps/api`)

- Node.js service (Node 20.9+). Build with `pnpm --filter @geedyx/api build`,
  run `pnpm --filter @geedyx/api start:prod`.
- Required variables: `DATABASE_URL`, `JWT_SECRET` (strong random value),
  `CORS_ORIGINS` (the real frontend origin), `COOKIE_SECURE=true`
  (served over HTTPS), plus `UPLOAD_DIR`, `MAX_IMAGE_SIZE_MB` as needed.
- Set `TRUST_PROXY=true` when it sits behind a reverse proxy so rate limiting
  sees the real client IP.

### Database

- PostgreSQL. Apply migrations with `pnpm db:migrate:deploy`.
- Enable HTTPS, restrict CORS, keep backups, and make sure `UPLOAD_DIR` lives on
  a **persistent filesystem** (see below).

See [docs/SECURITY.md](./docs/SECURITY.md) for the production security checklist.

### Local image storage — warning

Uploaded product images are stored on the local filesystem (`UPLOAD_DIR`). This
is a deliberate MVP decision that works for development, a single-host MVP and
environments with a persistent filesystem. It is **not** appropriate for
platforms with ephemeral filesystems (serverless, containers without persistent
volumes, multi-node setups). Migrating to Supabase Storage or S3 is planned for
a future phase (ADR-006/007) — it is intentionally not done in the MVP.

## Documentation

- [Product](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API contract](docs/API.md)
- [Security](docs/SECURITY.md)
- [UI](docs/UI.md)
- [Roadmap](docs/ROADMAP.md)
- [Architectural decisions](docs/DECISIONS.md)
- [Changelog](CHANGELOG.md)
- [Development rules](AGENTS.md)

## License

UNLICENSED — private project.