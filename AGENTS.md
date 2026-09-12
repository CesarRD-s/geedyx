# AGENTS.md

Primary instruction file for AI-assisted development on GEEDYX.

Read this file before implementing any task.

## Scope

- Do not implement functionality outside the current milestone without explicit approval.
- GEEDYX is an internal, single-company ERP with a private administration console and a versioned API for external store integrations. It is not a storefront and it is not a multi-tenant SaaS.
- The completed product/category MVP is a prototype foundation, not the target architecture for inventory, commerce or finance.
- The current milestone is **secure platform foundation**: installation, company configuration, internal users, persistent sessions, authorization, auditability, API versioning, integration credentials and file storage.
- Do not start inventory, sales, payments, invoicing, finance or an external storefront until the roadmap explicitly moves to that phase.
- Any new business domain must be documented in PRODUCT.md, ROADMAP.md, ARCHITECTURE.md, DATABASE.md, API.md, INTEGRATIONS.md, SECURITY.md and DECISIONS.md as applicable before implementation.

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

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/DECISIONS.md](docs/DECISIONS.md).

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

- Passwords use Argon2id.
- Browser authentication uses secure HttpOnly cookies and persistent server-side sessions.
- Do not store authentication tokens in localStorage.
- Never expose secrets to the frontend.
- Protected endpoints must require authentication and explicit authorization.
- Validate user input and file uploads.
- Configure CORS explicitly; it is not authorization or CSRF protection.
- Authentication and integration endpoints require rate limiting and audit events.

See [docs/SECURITY.md](docs/SECURITY.md).

## UI

GEEDYX should NOT use generic AI-generated dashboard aesthetics. Design inspiration: AWS Console, Dell official website, modern SaaS administration interfaces. These are inspiration only; do not copy proprietary interfaces.

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
- **Mandatory**: before creating or modifying any `apps/web` UI, consult `docs/BRAND.md`, `docs/UI.md` and `docs/DESIGN-TOKENS.md` — then inspect the existing implementation.
- Do not introduce new visual patterns when an existing pattern is sufficient.
- Colors come from the semantic tokens in `globals.css`. Use canonical names and never hard-code raw palette colors in components.
- The accent is configurable (`data-accent` on `<html>`); the brand stays monochrome — never color the logo/wordmark with the accent.
- Reuse shared primitives in `apps/web/src/components/ui/`. Document genuinely new recurring patterns in `docs/UI.md` before reuse.
- Support Light, Dark and System themes via tokens; never reach for scattered `dark:` exceptions.
- New dependencies require justification.

See [docs/BRAND.md](docs/BRAND.md), [docs/UI.md](docs/UI.md), [docs/DESIGN-TOKENS.md](docs/DESIGN-TOKENS.md), ADR-027 and ADR-029 in [docs/DECISIONS.md](docs/DECISIONS.md).

## Development workflow

1. Read `AGENTS.md`.
2. Read the relevant files under `/docs`.
3. Inspect the existing implementation.
4. Implement only the requested scope.
5. Run relevant tests/type checks/linting.
6. Update documentation when an architectural decision changes.
7. Do not add dependencies without justification.

## Commands

```bash
pnpm install
pnpm docker:up
pnpm dev:web
pnpm dev:api
pnpm build
pnpm lint
pnpm test:api
pnpm db:generate
pnpm db:migrate
pnpm db:migrate:deploy
pnpm db:studio
pnpm db:status
pnpm db:users
pnpm db:reset
```
