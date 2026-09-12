# GEEDYX — Current implementation status

This file is the living handoff for development. Update it in the same change
whenever a milestone, schema, public API contract, security control or shared UI
pattern changes. Detailed decisions remain in their domain document.

Last reviewed: 2026-09-12

## Active milestone

**Phase 1 — Secure platform foundation**
Current slice: **P1.3 — Users, roles and permissions**

## Implemented

- pnpm monorepo with separate Next.js and NestJS applications.
- PostgreSQL through Prisma migrations owned by the API.
- Prototype setup/login/logout/me flow using Argon2id and a JWT HttpOnly cookie.
- Prototype category and product CRUD, simple stock and local product images.
- Private administration shell, responsive drawer and persistent collapsible
  sidebar.
- Role-neutral authenticated workspace at `/app`; prototype `/admin/*` paths
  have been removed.
- Maintained API endpoints are versioned below `/api/v1`; the old unversioned
  routes have been removed.
- Generated OpenAPI is available in development, with documented product list
  pagination, filtering and sorting.
- Runtime configuration fails fast on missing or invalid critical values.
- Safe error envelopes, stable error codes, request correlation IDs, structured
  HTTP logs and liveness/readiness endpoints form the operational baseline.
- Every current category and product route is private and requires a valid
  authenticated session.
- Installation persists a singleton state plus the first company and owner in
  one transaction. Its server-side installation secret is required only once;
  completed installations redirect `/setup` to `/login`.
- Official GEEDYX UI contract: semantic colors, configurable accent,
  Light/Dark/System, Source Sans 3 and `md`/`lg`/`full` radius vocabulary.
- Official Light/Dark brand assets applied to the sidebar, mobile drawer and
  authentication screens; the compact sidebar uses the icon mark.
- Shared buttons render icon + label content in one horizontal flex row; the
  compact sidebar exposes a single clickable brand icon to expand it.

## Prototype limitations to remove in Phase 1

- Authentication uses a self-contained JWT and cannot revoke individual
  sessions server-side.
- Users have no account state, profile, roles or permissions.
- CSRF/origin enforcement, durable rate limiting, audit events and integration
  credentials are not implemented.
- Product images are tied to local storage rather than a general file-asset
  provider contract.
- CI, an isolated e2e database and a tested restore procedure are not complete.

## Next deliverable

P1.3 adds internal user profile data, account state, roles and permissions.
Authorization will be enforced by the API rather than by hiding workspace
controls.

## Documentation rule

Every completed change updates at least:

- `STATUS.md` for current implementation and next work;
- `ROADMAP.md` when milestone state or order changes;
- the relevant domain contract (`API.md`, `SECURITY.md`, `DATABASE.md`, `UI.md`,
  `ARCHITECTURE.md` or `INTEGRATIONS.md`) when behavior or architecture changes;
- `.env.example` when configuration changes, with no real secrets committed.

“Planned” means absent from production code. “Partial” identifies an incomplete
control and states its limitation. “Complete” requires implementation, relevant
tests and matching documentation.
