# GEEDYX — Architectural decisions

## ADR-001 — PostgreSQL is the source of truth

PostgreSQL stores business facts. Prisma is used only by NestJS; the frontend
never queries the database.

## ADR-002 — Next.js and NestJS are separate applications

The Next.js application owns the private UI. NestJS owns REST contracts,
business rules, integrations and data access. This separation is retained as
the ERP grows.

## ADR-003 — GEEDYX is a single-company internal ERP

One deployment serves one business. GEEDYX is not a multi-tenant SaaS and does
not include a public storefront. A `Company` ownership field remains explicit
on business data to preserve boundaries and future clarity.

## ADR-004 — External stores integrate through a versioned API

GEEDYX exposes authenticated resources under `/api/v1`, plus
`/api/v1/commerce`, `/api/v1/public` and `/api/v1/webhooks` surfaces for their
specialized consumers. The internal workspace, a store backend and a browser
have different credentials and permissions.

## ADR-005 — Browser authentication uses persistent opaque sessions

Phase 1 replaces the prototype stateless JWT cookie with a random opaque token
whose hash is stored in PostgreSQL. This supports revocation, device management,
idle/absolute expiry and security-event invalidation without refresh-token
complexity in the browser.

## ADR-006 — Authorization is server-side permission based

Internal users receive roles and permissions. Every protected API operation
checks current permission and company ownership. A login alone never grants
administrative access. Roles are resolved from the database on each protected
request, so a role or suspension change takes effect without waiting for JWT
expiry.

## ADR-007 — External integration credentials are scoped and revocable

Store backends receive separate, hashed client credentials with explicit scopes,
rotation, rate limits and audit logs. Secret credentials are never given to a
browser.

## ADR-008 — Financial and inventory facts are immutable after posting

Stock changes use movements. Posted orders, invoices and journal entries are
corrected by reversal or credit note. This creates auditability required for a
real ERP.

## ADR-009 — Payments use provider adapters and verified webhooks

GEEDYX does not store cardholder data. Payment providers are isolated behind an
adapter; the server validates signed webhooks and idempotency before changing
orders, inventory or financial records.

## ADR-010 — Files use provider-neutral private assets

Development may use local storage. Production targets S3-compatible object
storage. Business data stores asset IDs and object keys, not permanent public
URLs. Supabase and Cloudinary remain optional adapters.

## ADR-011 — API compatibility is a product commitment

URI major versioning, generated OpenAPI, documented deprecations, idempotency
and stable errors are required before third-party integrations are supported.

## ADR-013 — Internal web routes describe modules, not roles

All authenticated users enter through `/app`. Modules live below that boundary,
for example `/app/products`, `/app/categories`, `/app/inventory` and
`/app/reports`. URLs do not grant or imply authorization; the API enforces
permissions for every operation. The prototype `/admin/*` routes were removed
before external consumers could depend on them.

## ADR-012 — UI/UX is intentionally deferred

The existing design system remains in place, but no visual redesign, logo or
brand changes are part of the secure-platform milestone. Those decisions await
separate validation.

## ADR-027 — Design system uses semantic tokens and shared primitives

The existing admin UI uses documented semantic tokens and shared primitives.
This decision remains valid, but its visual application is outside the current
platform milestone. See [UI.md](./UI.md), [BRAND.md](./BRAND.md) and
[DESIGN-TOKENS.md](./DESIGN-TOKENS.md).

## ADR-029 — GEEDYX Design System v1.0

The documented visual system remains the baseline for existing and future admin
screens until the product owner validates a new UI/UX direction and logo. This
ADR is retained to preserve the UI documentation contract; it does not authorize
a redesign in the secure-platform milestone.

## Legacy decisions

The previous single-administrator, stateless JWT, public-catalog and local-image
MVP decisions describe prototype code only. They are superseded by the roadmap
above and remain until migration work replaces them.
