# GEEDYX - Architecture

## System boundary

GEEDYX is an internal ERP for one company per deployment. It provides a private
administration application and a versioned API; it does not host a public store.

```text
Admin browser ── private session ──> Next.js admin ─┐
                                                    ├─> NestJS API ─> PostgreSQL
External store backend ─ scoped credential ────────┤
Payment/fiscal provider ─ signed webhook ──────────┘
```

Next.js and NestJS remain separate applications. Next.js never accesses
PostgreSQL. NestJS owns business rules, database access, authorization,
integrations and file authorization.

## Deployment model

In production, expose the admin application and API through a reverse proxy on
trusted HTTPS origins. Prefer same-origin API routing for the private admin
application so a host-only, secure cookie can be used. The API itself remains a
separate Node service.

External store integrations call the commerce API from their backend. They do
not share the admin cookie and they do not receive administrative credentials.

## Domain modules

- `installation` and `company`: initial configuration and company settings.
- `identity`: internal users, basic profile metadata and passwords; recovery
  and MFA remain planned.
- `authorization`: implemented roles, permissions and API guards.
- `sessions`: opaque browser sessions and device management.
- `account-context`: effective language, time zone and regional formatting.
- `audit`: append-only security and business events.
- `integrations`: clients, scopes, idempotency and webhook deliveries.
- `files`: private assets and provider adapters.
- `catalog`, `inventory`, `customers`, `orders`, `payments`, `invoicing`,
  `finance` and `reporting`: later business domains.

Each module follows controller → service → Prisma/data access. Cross-domain
writes are explicit services and database transactions, not controller chaining.
Events that leave the system use an outbox/delivery record so a committed
business action is not lost when a webhook or notification fails.

## Account and temporal context

`Mi cuenta` contains personal profile, preferences and security as child areas.
`Administración` contains company configuration, internal users and later roles
and auditability. A value has one owner and one write path.

Persisted instants are UTC. The company time zone governs business rules,
documents and reporting. A user's time zone changes only that user's display.
A shared date input is not an operational calendar or scheduling module.

P1.4a.4 defines three frontend boundary values: calendar date (`YYYY-MM-DD`),
local wall-clock time (`HH:mm`) and inclusive date range. Shared native input
primitives keep these values as strings. They do not call `new Date(value)` or
attach an implicit browser/UTC zone. Only an explicitly documented instant may
cross the REST boundary as an ISO 8601 UTC value.

P1.4a.5 centralizes instant boundaries in `lib/temporal/instant.ts`. Conversion
from local input requires calendar date, local time and IANA zone. It resolves
all matching offsets around the target wall time and returns a discriminated
result, rejecting DST gaps and overlaps. Conversion from UTC always requires the
display zone. Session timestamps use this shared parser and formatter.

## Authentication and authorization target

The browser presents one random opaque token in an HttpOnly cookie. PostgreSQL
stores only its hash and decides expiry, revocation and active device state.
Authorization is evaluated server-side against current roles and permissions.
External integrations use independently revocable, scoped credentials.

JWTs may later be used for a separate machine-to-machine or mobile strategy;
they are not the planned browser-session mechanism.

Recent authentication is session-scoped. Sensitive controllers compose the
normal session and account guards with `RecentAuthenticationGuard`; the guard
reads the persisted confirmation timestamp and configured validity window.
Password verification stays in the authentication domain and browser state is
never an authorization input.

## Files and asynchronous work

Files are stored by an adapter and described by `FileAsset`. Business rows refer
to an asset ID, not a filesystem path or permanent public URL. Background jobs
will handle webhooks, notifications, scans and generated documents once a
durable queue is introduced.

## Current state

The repository currently has `auth`, `company`, `users`, `categories`,
`products` and `images`. Roles and permissions are enforced by NestJS for the
current catalog, company and users resources. Browser sessions are persisted in
PostgreSQL. Audit, integrations, files and later business modules remain
planned.

The API resolves regional context from user overrides, company defaults and
es/UTC fallbacks, independently per field. Invalid legacy values fall through.
The authenticated workspace provides this result to client components; session
dates consume it with an explicit time zone. Successful preference/company
updates refresh the server context. Browser locale and time zone are never
implicit defaults.

P1.4a.3 implements the workspace translation boundary in Next.js. The API remains
the authority for the effective locale. A server-safe catalog resolver and one
client provider consume that value; both catalogs implement the same TypeScript
key set. This keeps persistence and fallback rules in NestJS while presentation
copy remains owned by the web application.
