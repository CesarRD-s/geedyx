# GEEDYX - Current implementation status

This file is the living handoff for development. Update it in the same change
whenever a milestone, schema, public API contract, security control or shared UI
pattern changes. Detailed decisions remain in their domain document.

Last reviewed: 2026-09-13

## Active milestone

**Phase 1 - Secure platform foundation**
Current slice: **P1.5 - Audit, integration and files foundation**

## Implemented

- pnpm monorepo with separate Next.js and NestJS applications.
- PostgreSQL through Prisma migrations owned by the API.
- Setup/login/logout/me with Argon2id and persisted opaque browser sessions.
  Concurrent login retains existing sessions within the configured limit and
  revokes only the oldest excess sessions.
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

## Prototype limitations to remove in Phase 1

- Audit events and integration credentials are not implemented. Password-reset
  delivery requires an external HTTPS adapter in
  production; local development intentionally leaves delivery disabled unless
  configured.
- Product images are tied to local storage rather than a general file-asset
  provider contract.
- CI, an isolated e2e database and a tested restore procedure are not complete.

## Next deliverable

P1.4a.1 reorganized the workspace around `Mi cuenta` and `Administración`.
P1.4a.2 implements effective regional context, nullable personal overrides,
validated time zones and a single personal preference write path. Session dates
use the shared display context. Existing preferences are preserved by migration.
P1.4a.3 adds type-checked es/en catalogs for the secure platform shell, dashboard,
account, company and security surfaces. Personal and company language selectors
are active, inheritance refreshes server context and the document language follows
the effective locale. P1.4a.4 adds shared accessible date, time and inclusive
date-range fields plus strict calendar-value parsing and stable formatting.
P1.4a.5 completes the account and temporal foundation with strict UTC instant
parsing, explicit IANA-zone conversion in both directions and regional instant
formatting. Nonexistent and ambiguous local times are rejected instead of being
silently adjusted. Session activity now consumes the shared formatter. P1.4a
does not add operational calendar or scheduling. P1.4a.6 adds the current date
and time to the workspace header without displaying a city, zone abbreviation
or seconds. The compact mobile header shows time only and the value refreshes at
minute boundaries. P1.4b enforces recent authentication for company and
internal-user mutations with a default 10-minute session window. It also adds
non-enumerating recovery requests, provider-neutral delivery, hashed one-time
tokens, public recovery screens and transactional session revocation after a
reset. P1.4c.1 replaces critical in-memory authentication limits with durable,
hashed PostgreSQL buckets. P1.4c.2 enforces approved browser origins alongside
session-bound CSRF and rotates session and CSRF credentials after successful
reauthentication or password changes without extending absolute expiry. P1.4c.3
adds storage for encrypted TOTP factors, replay detection and hashed one-use
recovery codes without exposing an incomplete MFA flow. P1.4c is complete.
Next: begin P1.5 with append-only audit events.

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
