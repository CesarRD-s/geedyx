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

**Complete.**

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
  P1.5 will persist for recovery and reauthentication outcomes. The temporary
  HTTP boundary was replaced by the notifications module in P1.5b.

### P1.4c - Authentication hardening

**Complete.**

- Persist rate-limit state for authentication, recovery and other sensitive
  endpoints so process restarts cannot clear enforcement. Completed in
  P1.4c.1 with hashed PostgreSQL buckets.
- Verify session rotation, idle and absolute expiry, revocation, browser origin
  and CSRF behavior as one documented security contract. Completed in P1.4c.2:
  reauthentication and password changes rotate both credentials while
  preserving absolute expiry, and every session mutation requires an approved
  origin plus its session-bound CSRF token.
- Keep the account model ready for a later MFA implementation without exposing
  an incomplete enrollment flow. Completed in P1.4c.3 with metadata for
  encrypted TOTP secrets, replay state and hashed one-use recovery-code records.
  No MFA route or UI is exposed.

### P1.5 - Operational platform modules

**Active.** P1.5 closes the platform modules that every later business domain
uses. It intentionally avoids inventory, orders, payments and external-store
behavior.

#### P1.5a - Audit foundation

**Partial.** The immutable PostgreSQL ledger and typed writer exist.
Authentication, session, authorization, user, company and current catalog
mutations record events transactionally.

- Add the private audit reader for authorized operators: pagination and filters
  by date, actor, action, outcome and target.
- Define retention and the `audit.read` permission. Audit records never expose
  passwords, tokens, cookies, secrets or complete file contents.
- Exports, SIEM forwarding and broad activity telemetry are deferred.

#### P1.5b - Notifications and email delivery

**Partial.**

- The notifications module persists provider-neutral `EmailDelivery` records
  for password recovery. They contain template, provider, delivery state,
  attempt count and a recipient hash, never the recipient address, message or
  one-time link.
- Resend is the initial production adapter. Local development uses the
  `disabled` adapter, which records a suppressed delivery and never reaches a
  real recipient. Failed Resend calls retry a bounded number of times with one
  idempotency key.
- Password recovery now uses this boundary. An undelivered link is invalidated.
- Deliver only password recovery, user invitation and email-change
  verification in P1. Internal notification center, SMS, WhatsApp, push,
  marketing and multiple active email providers are deferred.
- Provider credentials remain deployment secrets. The workspace may show
  provider status and recent delivery outcomes, but never stores or displays
  secret values.

#### P1.5c - File assets and storage

**Complete.**

- `FileAsset` retains owner, storage key, MIME type, size, checksum, state and
  audit context. Files are private by default.
- Supabase Storage is the initial production adapter through its S3-compatible
  interface. Local development uses an explicit local provider.
- NestJS authorizes catalog access and issues short-lived signed URLs. New
  product images use `FileAsset` rather than public local paths.
- Do not add multiple active storage providers, automatic fallback, public
  permanent URLs, document scanning or user avatars in P1.

#### P1.5d - Identity and account completion

**Complete.**

- Installation now provisions the four system roles and their permissions:
  `OWNER`, `ADMIN`, `CATALOG_MANAGER` and `VIEWER`. A migration repairs
  already-installed companies that were affected by the earlier omission.
- Replace the unsupported temporary-password promise with an invitation flow
  that lets a new internal user choose a password through a one-time email
  link. Completed with the `INVITED` account state and a separate hashed token.
- Add verified email lifecycle: email verification where needed, secure email
  change with recent authentication, and the existing non-enumerating password
  recovery flow. The API now creates and confirms a separate hashed email-change
  token, then revokes every session after changing the address.
- Keep opaque sessions, session rotation, idle and absolute expiry, device
  management, CSRF, exact origin checks and durable rate limits. Do not add
  JWT refresh tokens.
- MFA persistence remains dormant. MFA, SSO, social login, passkeys, SMS and
  external identity providers require a future product decision.

#### P1.5e - Integration boundary

**Partial and not user-visible in P1.**

- The existing credential, scope, idempotency and signed-webhook persistence
  remains a protected technical boundary. Secrets are hashed or encrypted and
  may be rotated or revoked through the private API.
- No P1 business route accepts integration credentials and no webhook is sent
  until P3 owns catalog, availability or order events. Do not add an operator
  UI that configures inactive connectors.

#### P1.5 closing sequence

1. Cover role provisioning and its repair with isolated E2E tests.
2. Expose the authorized audit reader and provider-status views.
3. Complete the P1.6 release gate.

### P1.6 - Release gate

**Planned.**

- Isolated e2e database and tests for setup, role provisioning, invitation,
  login, expiry, revocation, authorization, CSRF, email lifecycle, file access
  and audit trails.
- CI checks for build, lint, unit and e2e tests, migrations and generated API
  contract. The current CI unit, lint and build checks are a partial baseline.
- Backup and tested restore procedure, dependency/security review and production
  deployment checklist.
- No unresolved critical/high security findings and no undocumented endpoint or
  schema behavior.

Phase 1 deliberately excludes variants, warehouses, orders, payments,
accounting and the public storefront. Those domains begin only after P1.6.

### Phase 1 administration structure

The private workspace uses compact parent modules and child routes:

```text
Mi cuenta
├─ Perfil
└─ Seguridad

Administración
├─ Organización
│  └─ Empresa
├─ Identidad y seguridad
│  ├─ Usuarios y roles
│  └─ Auditoría
└─ Plataforma
   ├─ Notificaciones
   └─ Archivos
```

Integration administration becomes visible in Phase 3, when a business domain
can use it. Company language is a global organization setting; P1 does not add
new per-user language choices.

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
