# GEEDYX - Current implementation status

This file is the living handoff for development. Update it in the same change
whenever a milestone, schema, public API contract, security control or shared UI
pattern changes. Detailed decisions remain in their domain document.

Last reviewed: 2026-09-12

## Active milestone

**Phase 1 - Secure platform foundation**
Current slice: **P1.4a - Account context and temporal foundation**

## Implemented

- pnpm monorepo with separate Next.js and NestJS applications.
- PostgreSQL through Prisma migrations owned by the API.
- Setup/login/logout/me with Argon2id and persisted opaque browser sessions.
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
- Installation persists a singleton state plus a provisional company and owner
  in one transaction. It asks only for the owner account and confirmation of
  its password; completed installations redirect `/setup` to `/app` for an
  active session or `/login` otherwise.
- Company name, default language (`es` or `en`), time zone and base currency
  are optional database settings. They are managed at `/app/settings` by users
  with `company.manage`; pending values never block access to the workspace.
- Internal users have display name, locale, time zone, account state and login
  metadata. System roles and database-backed permissions protect catalog and
  user operations; suspended users lose protected access immediately.
- `/app/profile` lets each authenticated user update their own display name,
  language and time zone. These individual preferences do not alter company defaults.
- `/app/users` provides permission-aware administration of internal users,
  account status and role assignments. The installation owner is protected from
  suspension and reassignment.
- Official GEEDYX UI contract: semantic colors, configurable accent,
  Light/Dark/System, Source Sans 3 and `md`/`lg`/`full` radius vocabulary.
- Official Light/Dark brand assets applied to the sidebar, mobile drawer and
  authentication screens; the compact sidebar uses the icon mark.
- Shared buttons render icon + label content in one horizontal flex row; the
  compact sidebar exposes a single clickable brand icon to expand it.

## Prototype limitations to remove in Phase 1

- Password recovery delivery, durable rate limiting, audit events and integration
  credentials are not implemented.
- Product images are tied to local storage rather than a general file-asset
  provider contract.
- CI, an isolated e2e database and a tested restore procedure are not complete.

## Next deliverable

Centralize account configuration, regional context and reusable date inputs.
This slice does not add an operational calendar or business scheduling.

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
