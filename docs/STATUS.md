# GEEDYX - Current implementation status

This file is the living handoff for development. Update it in the same change
whenever a milestone, schema, public API contract, security control or shared UI
pattern changes. Detailed decisions remain in their domain document.

Last reviewed: 2026-09-15

## Active milestone

**Phase 1 - Secure platform foundation**
Current slice: **P1.5 - Operational platform modules**

## Implemented

- pnpm monorepo with separate Next.js and NestJS applications.
- PostgreSQL through Prisma migrations owned by the API.
- Setup/login/logout/me with Argon2id and persisted opaque browser sessions.
  Concurrent login retains existing sessions within the configured limit and
  revokes only the oldest excess sessions.
- Prototype category and product CRUD, simple stock and private product images.
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
- Company name, stored default language (`es` or `en`), time zone and base currency
  are optional database settings. They are managed at `/app/administration/company` by users
  with `company.manage`; pending values never block access to the workspace.
- Internal users have display name, locale, time zone, account state and login
  metadata. System roles and database-backed permissions protect catalog and
  user operations; suspended users lose protected access immediately.
- `/app/account/profile` owns display name; `/app/account/preferences` owns
  personal language and time zone. Individual preferences do not alter company
  defaults; `es` and `en` are active for the documented platform surfaces.
- `/app/administration/users` provides permission-aware administration of internal users,
  account status and role assignments. The installation owner is protected from
  suspension and reassignment.
- Official GEEDYX UI contract: semantic colors, configurable accent,
  Light/Dark/System, Source Sans 3 and `md`/`lg`/`full` radius vocabulary.
- Official Light/Dark brand assets applied to the sidebar, mobile drawer and
  authentication screens; the compact sidebar uses the icon mark.
- Shared buttons render icon + label content in one horizontal flex row; the
  compact sidebar exposes a single clickable brand icon to expand it.
- The workspace header shows the current date and time with the effective
  language and time zone. Compact headers show time only; the UI omits city,
  zone abbreviation, seconds and calendar actions.
- Sensitive company and internal-user mutations require a password confirmation
  no older than the configured session window. The API persists and enforces
  the confirmation timestamp; the web preserves the pending operation and
  retries it only after successful reauthentication.
- Password recovery uses non-enumerating requests, hashed short-lived tokens and
  transactional one-time consumption. A successful reset changes the password
  and revokes every session. Public recovery screens consume the documented API;
  production requires a configured HTTPS delivery adapter.
- Authentication and recovery limits use hashed PostgreSQL buckets shared by
  API instances. The critical five-attempt window survives process restarts;
  the general in-memory API throttle remains an additional coarse limit.

The current personal language preference remains implemented behavior. P1.5
will consolidate the product contract around a company-level language before
adding any further regional preference behavior.

## Known P1 gaps

- User creation sends an invitation and leaves the account pending until its
  recipient creates a password through the one-time link.
- Password recovery uses the notification boundary. Production deployment still
  requires Resend credentials and a verified sender; local configuration
  intentionally suppresses delivery.
- Audit rows are immutable and written, but there is no audit reader in the
  workspace or read API.
- Integration credentials and webhook records exist only as a future technical
  boundary. There is no P1 business consumer or operator UI.
- CI has unit tests, lint and build checks. E2E execution, migration deploy,
  API-contract validation, restore verification and release checklist remain
  open.

## Next deliverable

Add the audit reader and P1.6 release gate in the order
defined by `ROADMAP.md`. Isolated E2E coverage remains part of the release gate.

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
