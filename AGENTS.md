# AGENTS.md

Primary instruction file for AI-assisted development on GEEDYX.

Read this file before implementing any task.

## Scope

- Do not implement functionality outside the current milestone without explicit
  approval.
- Do not expand the MVP automatically.
- The current milestone is the project foundation. Prisma, authentication, CRUD,
  image uploads and the dashboard are NOT part of the foundation.

## TypeScript

- Use strict TypeScript everywhere.
- Never use `any`.
- Avoid unnecessary type assertions.
- Prefer explicit types.
- Do not suppress compiler errors without a documented reason.

## Architecture

- Next.js and NestJS are separate applications.
- Next.js must not access PostgreSQL directly.
- NestJS owns business logic and database access.
- Communication between frontend and backend uses REST.
- Avoid premature abstractions.
- Avoid microservices.
- Avoid unnecessary dependencies.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[docs/DECISIONS.md](docs/DECISIONS.md).

## Backend

- Organize NestJS by business domain.
- Controllers handle HTTP concerns.
- Services contain business logic.
- Validate external input.
- Prefer DTOs for API contracts.

## Database

- PostgreSQL is the source of truth.
- Prisma is the ORM, owned by the NestJS API.
- Database schema changes must use migrations.

See [docs/DATABASE.md](docs/DATABASE.md).

## Security

- Passwords will use Argon2.
- Authentication will use secure HttpOnly cookies.
- Do not store authentication tokens in localStorage.
- Never expose secrets to the frontend.
- Protected endpoints must require authentication.
- Validate user input.
- Validate file uploads.
- Configure CORS explicitly.
- Authentication endpoints should eventually use rate limiting.

See [docs/SECURITY.md](docs/SECURITY.md).

## UI

GEEDYX should NOT use generic AI-generated dashboard aesthetics.
Design inspiration: AWS Console, Dell official website, modern SaaS
administration interfaces. These are inspiration only; do not copy proprietary
interfaces.

Prefer:

- clear information hierarchy
- functional density
- compact navigation
- useful tables
- filters
- search
- clear actions
- restrained cards
- consistent spacing
- responsive layouts

Avoid:

- excessive rounded cards
- excessive gradients
- glassmorphism
- excessive shadows
- decorative UI without purpose
- oversized dashboard metric cards
- generic AI SaaS layouts

Use the GEEDYX Design System:

- **Every new UI must use the Design System defined in `docs/UI.md`.**
- **Mandatory**: before creating or modifying any `apps/web` UI, consult
  `docs/BRAND.md` (identity: monochrome, accent-independent wordmark),
  `docs/UI.md` (contract), and `docs/DESIGN-TOKENS.md` (token values) —
  then inspect the existing implementation.
- Do not introduce new visual patterns when an existing pattern is sufficient.
- Colors come from the semantic tokens in `globals.css`. Use the **canonical
  names** (`bg-surface-subtle`, `bg-surface-raised`, `text-secondary`,
  `text-muted`, `border-border`, `border-border-strong`, `bg-accent`,
  `text-accent-foreground`, `bg-accent-muted`, `bg-success`, `text-danger-strong`,
  `bg-info`, `bg-overlay`, `shadow-panel`, …). Never hard-code raw palette colors
  (slate/blue/white/hex) in components. CP12 names (`primary*`, `surface-muted`,
  `surface-elevated`, `muted-foreground`) are deprecated aliases — do not use
  them in new UI.
- The accent is configurable (`data-accent` on `<html>`); the brand stays
  monochrome — never color the logo/wordmark with the accent.
- Reuse the shared primitives in `apps/web/src/components/ui/` (Button,
  Dialog, Input/Select/Textarea, Badge, EmptyState, ErrorState, PageHeader,
  SearchInput, IconButton, ThemeToggle, …). Extend them only when a real,
  repeated need exists. When a genuinely new pattern is required, document it
  in `docs/UI.md` **before** reusing it.
- Support Light, Dark and System themes via the tokens; never reach for
  scattered `dark:` exceptions.
- New dependencies (icons, theme, etc.) require justification.

See [docs/BRAND.md](docs/BRAND.md), [docs/UI.md](docs/UI.md),
[docs/DESIGN-TOKENS.md](docs/DESIGN-TOKENS.md), ADR-029 (and ADR-027) in
[docs/DECISIONS.md](docs/DECISIONS.md).

## Development workflow

Before implementing a task:

1. Read `AGENTS.md`.
2. Read the relevant files under `/docs`.
3. Inspect the existing implementation.
4. Implement only the requested scope.
5. Run relevant tests/type checks/linting.
6. Update documentation when an architectural decision changes.
7. Do not add dependencies without justification.

## Commands

```bash
# Install dependencies
pnpm install

# Start PostgreSQL (Docker)
pnpm docker:up

# Development servers
pnpm dev:web   # Next.js on http://localhost:3000
pnpm dev:api   # NestJS on http://localhost:3001

# Build
pnpm build

# Lint
pnpm lint

# Tests (API)
pnpm test:api

# Database
pnpm db:generate           # regenerate Prisma client after schema changes
pnpm db:migrate            # create/apply a development migration
pnpm db:migrate:deploy     # apply pending migrations
pnpm db:studio             # open Prisma Studio
pnpm db:status             # (dev) show DB connection + Users/Categories/Products counts
pnpm db:users              # (dev) list development users
pnpm db:reset              # (dev only) wipe the local DB and re-apply migrations; refused for production/non-local DATABASE_URL
```