# GEEDYX - Roadmap

Nothing marked **planned** is implemented. A phase is completed only after its
schema migrations, API contract, security review, tests and documentation are
complete.

## Completed prototype foundation

- Monorepo: Next.js admin console, NestJS API and PostgreSQL/Prisma.
- Prototype bootstrap/login with Argon2id, now migrated to persistent opaque sessions.
- Categories, products, simple stock field and local product images.
- Private administration screens and basic count dashboard.

## Phase 1 - Secure platform foundation

**Active milestone.** Work is delivered in the following order. A slice is not
complete until its migration, API behavior, tests and documentation agree.

### P1.0 - Contract and current-state baseline

**Complete.**

- Product scope fixed as an internal, single-company ERP with an external API
  for storefronts and approved integrations.
- Official UI contract, semantic tokens, responsive behavior and collapsible
  administration navigation documented and applied to the current screens.
- Prototype capabilities and security limitations explicitly recorded.

### P1.1 - API and operational baseline

**Complete.**

- Move maintained endpoints to `/api/v1` without silently extending prototype
  routes.
- Move the authenticated web workspace from `/admin` to role-neutral `/app`
  and remove the prototype routes before they become a compatibility burden.
- Generate OpenAPI from DTOs and document pagination, sorting and filtering.
- Standardize safe error envelopes, stable error codes and request IDs.
- Validate runtime configuration at startup and fail fast on missing secrets.
- Add liveness/readiness health endpoints and structured application logs.

### P1.2 - Installation and organization identity

**Complete.**

- Add persisted installation state and a provisional company record.
- Keep first-run setup simple: owner username, email, password and password confirmation.
- Create company, owner and first session in one database transaction.
- Make setup permanently unavailable after successful installation.
- Allow company name, locale, time zone and base currency to remain pending and
  be updated from the private workspace without an onboarding gate.

### P1.3 - Users, roles and permissions

**Complete.**

- Add display name, locale/time zone, account status, password-change timestamp
  and last-login metadata.
- Define roles and granular permissions; enforce permissions in NestJS rather
  than hiding UI controls only.
- Add user creation, activation, suspension and role assignment.

Profile-avatar assets and append-only audit records are delivered with the file
and audit foundation in P1.5, where their storage and retention rules can be
enforced consistently.

### P1.4 - Professional authentication and sessions

**Partial.**

- Replace JWT-cookie authentication with random opaque server-side sessions;
  persist only token hashes.
- Enforce idle and absolute expiration, rotation, logout revocation and session
  limits per account.
- Add current-device listing, revoke-one and revoke-other-sessions flows.
- Add password change, secure reset tokens and reauthentication for sensitive
  operations.
- Enforce browser origin/CSRF controls and durable rate limiting; keep the data
  model ready for MFA without blocking the first internal release.

### P1.4a - Account context and temporal foundation

**Complete.**

- Establish parent modules and child routes for `Mi cuenta` and
  `Administración` before adding more workspace domains. Completed.
- Centralize personal profile, personal preferences and security so each value
  has one owner and one write path. Completed in P1.4a.2.
- Define company defaults and personal overrides for language and time zone;
  retain base currency as a company-wide setting. Completed in P1.4a.2.
- Implement real `es` and `en` catalogs before exposing an effective language
  selector. Completed in P1.4a.3 for the secure platform shell and account,
  company and security surfaces.
- Create shared accessible date, time and date-range input primitives. Completed
  in P1.4a.4.
- Persist instants in UTC and convert only at display or local-input boundaries.
  Completed in P1.4a.5.
- Show the current date and time in the workspace header using the effective
  locale and time zone. The compact mobile presentation shows time only. No
  city, time-zone abbreviation or seconds are displayed. Completed in
  P1.4a.6.
- Defer an operational calendar until a business domain owns appointments,
  deadlines or scheduled work.

### P1.4b - Password recovery and sensitive-operation reauthentication

**Complete.**

- Complete password change and require recent reauthentication for sensitive
  account and administration operations. Recent authentication is implemented
  for company settings and internal-user mutations.
- Add single-use, expiring password-reset tokens without exposing stored token
  values. Completed.
- Define a delivery boundary for recovery messages and the audit events that
  P1.5 will persist for recovery and reauthentication outcomes. Completed with
  a provider-neutral authenticated HTTP boundary.

### P1.4c - Authentication hardening

**Planned.**

- Persist rate-limit state for authentication, recovery and other sensitive
  endpoints so process restarts cannot clear enforcement.
- Verify session rotation, idle and absolute expiry, revocation, browser origin
  and CSRF behavior as one documented security contract.
- Keep the account model ready for a later MFA implementation without exposing
  an incomplete enrollment flow.

### P1.5 - Audit, integration and files foundation

**Planned.**

- Add append-only audit events for authentication, authorization, configuration
  and security-sensitive mutations.
- Add integration clients with hashed scoped credentials, rotation, revocation
  and idempotency records.
- Define signed inbound/outbound webhook envelopes and replay protection.
- Replace product-only image handling with private `FileAsset` metadata and a
  provider interface: local development storage plus S3-compatible production
  storage.

### P1.6 - Release gate

**Planned.**

- Isolated e2e database and tests for setup, login, expiry, revocation,
  authorization, CSRF and audit trails.
- CI checks for build, lint, tests, migrations and generated API contract.
- Backup and tested restore procedure, dependency/security review and production
  deployment checklist.
- No unresolved critical/high security findings and no undocumented endpoint or
  schema behavior.

Phase 1 deliberately excludes variants, warehouses, orders, payments,
accounting and the public storefront. Those domains begin only after P1.6.

## Phase 2 - Master data and inventory

**Planned.**

- Product variants, units, price lists, tax configuration and currencies.
- Warehouses and locations.
- Immutable inventory movements, adjustments, transfers, reservations and
  stock history.
- Low-stock rules and operational inventory reports.
- Suppliers and customer records.

## Phase 3 - Commerce integration

**Planned.**

- Read-only catalog and availability resources for external stores.
- Customer and order ingestion with idempotency.
- Order lifecycle, fulfillment, returns and cancellation.
- Inventory reservation/release rules.
- Outbound webhooks and connector patterns for external commerce platforms.

## Phase 4 - Payments and invoicing

**Planned.**

- Payment attempts, provider adapters, signed webhook processing, refunds and
  dispute records.
- Hosted checkout integrations; GEEDYX will not store cardholder data.
- Invoice and credit-note lifecycle, numbering and tax snapshots.
- Country-specific fiscal providers isolated behind adapters.

## Phase 5 - Finance and reporting

**Planned.**

- Accounts receivable/payable, cash and bank reconciliation.
- Double-entry ledger, accounting periods and controlled closing.
- Operational, inventory, sales and financial reports.
- Exports and reporting permissions.

## Deferred until a concrete need

- Built-in public storefront.
- Multi-company SaaS tenancy.
- POS, manufacturing, HR, CRM and project management.
- Saved payment methods and recurring payments.
