# GEEDYX — Architecture

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

## Domain modules — planned target

- `installation` and `company`: initial configuration and company settings.
- `identity`: internal users, profiles, passwords and MFA.
- `authorization`: roles, permissions and API guards.
- `sessions`: opaque browser sessions and device management.
- `audit`: append-only security and business events.
- `integrations`: clients, scopes, idempotency and webhook deliveries.
- `files`: private assets and provider adapters.
- `catalog`, `inventory`, `customers`, `orders`, `payments`, `invoicing`,
  `finance` and `reporting`: later business domains.

Each module follows controller → service → Prisma/data access. Cross-domain
writes are explicit services and database transactions, not controller chaining.
Events that leave the system use an outbox/delivery record so a committed
business action is not lost when a webhook or notification fails.

## Authentication and authorization target

The browser presents one random opaque token in an HttpOnly cookie. PostgreSQL
stores only its hash and decides expiry, revocation and active device state.
Authorization is evaluated server-side against current roles and permissions.
External integrations use independently revocable, scoped credentials.

JWTs may later be used for a separate machine-to-machine or mobile strategy;
they are not the planned browser-session mechanism.

## Files and asynchronous work

Files are stored by an adapter and described by `FileAsset`. Business rows refer
to an asset ID, not a filesystem path or permanent public URL. Background jobs
will handle webhooks, notifications, scans and generated documents once a
durable queue is introduced.

## Current state

The repository currently has the prototype modules `auth`, `categories`,
`products` and `images`. The target modules above are planned and must not be
claimed as implemented.
