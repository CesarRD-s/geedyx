# GEEDYX - Database

## Ownership and migrations

PostgreSQL is the source of truth. Only the NestJS API accesses it through
Prisma. Every schema change uses a reviewed Prisma migration; the Next.js admin
application never reads it directly.

The current schema contains `Installation`, `Company`, `User`, `Role`,
`Permission`, `UserRole`, `RolePermission`, `Session`, `PasswordResetToken`,
`RateLimitBucket`, `MfaFactor`, `MfaRecoveryCode`, `AuditEvent`, `Category` and
`Product`.
`Installation` is a singleton that closes bootstrap permanently; every user
and role belongs to the one configured company.

## Implemented identity foundation

| Model | Purpose |
| --- | --- |
| `Installation` | Immutable singleton recording the completed installation, company and owner. |
| `Company` | The single operational business. It begins with a provisional name and stores optional name, default locale, time zone, currency and configuration completion time. |
| `User` | Internal credential identity; it belongs to one company. |
| `Role`, `Permission`, `UserRole`, `RolePermission` | Explicit RBAC relations enforced by NestJS on every private operation. |

The installation transaction creates all three records together. The migration
also preserves pre-existing development users by assigning them to a legacy
company and writing the installation singleton, so setup does not reopen.

System roles are created per company: `OWNER`, `ADMIN`, `CATALOG_MANAGER` and
`VIEWER`. Permission codes are global, stable values: `catalog.read`,
`catalog.manage`, `users.read`, `users.manage` and `company.manage`. The installation owner is
the only initial `OWNER`; it cannot be suspended or reassigned through the user
management API. The system-role repair migration completes this vocabulary and
its permissions for companies created by earlier installations.

Company `locale` and `timeZone` are defaults. User `locale` and `timeZone` are
personal overrides. Timestamps remain UTC; neither field changes stored data.

`Session.reauthenticatedAt` contains the last successful password confirmation
for that session. The API updates it only after login, password change or
explicit reauthentication. Authorization never trusts a browser timestamp for
this decision.

`PasswordResetToken` stores only a SHA-256 token hash, its owner, creation and
expiry instants, and the one-time `usedAt` marker. A new request invalidates
older unused records for the same user. Consumption updates the password,
marks the token used and revokes all sessions in one transaction.

`RateLimitBucket` stores a scope plus a SHA-256 subject key; raw IP addresses,
emails, session IDs and reset tokens are not retained. Counts, window expiry and
temporary blocking survive API restarts and are shared by every API instance.

`MfaFactor` prepares TOTP enrollment without enabling it. A factor owns separate
AES-256-GCM ciphertext, 96-bit nonce, authentication tag and key-version fields;
the database has no plaintext-secret column. `verifiedAt` distinguishes a
pending enrollment from a usable factor, `revokedAt` preserves lifecycle state
and `lastUsedStep` supports rejection of a reused TOTP time step.

`MfaRecoveryCode` belongs directly to a user. It stores only an Argon2id hash
plus used and revoked timestamps so future codes can be consumed once and a
replacement batch can invalidate the preceding batch. Raw recovery codes must
only be shown at generation time and never enter logs or API responses again.

`AuditEvent` is an append-only security ledger. PostgreSQL rejects `UPDATE`,
`DELETE` and `TRUNCATE` statements on the table. Events retain company, actor,
action, outcome, target and request context plus a small metadata object that
must not contain credentials or secrets. A monotonic sequence provides stable
ordering while the opaque event ID is safe for later API use.

Authentication and session mutations insert their successful event in the same
transaction as their state change. Failed login and recovery identities use a
SHA-256 subject hash instead of the submitted email or token.

## P1 platform data model

Phase 1 introduces the following models before business modules are expanded:

| Model | Purpose |
| --- | --- |
| `EmailDelivery` | Implemented transactional email evidence: template, provider, delivery state, retry metadata and recipient hash. It never stores a recipient address, message body or token. |
| `UserInvitation`, `EmailChangeToken` | Implemented single-use hashed tokens for invitation and verified email change. |
| `FileAsset` | Implemented private object metadata: company and creator context, provider/key, MIME type, byte size, checksum and lifecycle state. It never stores a permanent public URL. |

`IntegrationClient`, `IdempotencyRecord`, `WebhookEndpoint`, `WebhookDelivery`
and `InboundWebhookEvent` are implemented technical boundary models. No P1
business route consumes them.

`Customer` is a future business model owned by the company. It may reference an
external-store account but it is not an internal `User` role.

## ERP data rules - planned

- Business tables receive a `companyId` even though one company is supported;
  this makes ownership explicit without implementing SaaS tenancy.
- IDs are opaque CUIDs. Externally visible document numbers are separate,
  controlled business values.
- Money uses PostgreSQL `NUMERIC`, never floating point. Currency and scale are
  retained with the document that used them.
- All times are stored as UTC `timestamptz`; business timezone is configuration.
- Inventory uses `InventoryMovement`; a product balance is a derived or
  transactionally maintained projection.
- Posted orders, invoices and journal entries are immutable. Corrections create
  reversals or credit notes.
- Unique constraints, foreign keys and transactional writes protect invariants;
  API validation is additional protection, not a replacement.

## File storage

Local filesystem storage is suitable for development and test only. It is not
served as a static directory. Production uses the same provider abstraction
with Supabase Storage through its S3-compatible interface. `FileAsset` stores
the opaque object key and validated metadata, while the API issues a signed URL
with a short expiry only after an authorized catalog request. The local and S3
providers are selected explicitly by `FILE_STORAGE_PROVIDER`; a production
deployment fails to start without the S3 configuration and file URL signing
secret. A later adapter may support MinIO, Cloudflare R2 or another compatible
provider without changing business rows.

## Operational requirements

- Separate local, test, staging and production databases.
- E2E tests must never run against a developer's working database.
- Production backups require documented restore verification.
- Migrations run before application rollout and must be backward compatible
  during rolling deployments.

## Personal regional inheritance (P1.4a.2)

User locale and timeZone are nullable, without database defaults. Null means
inherit the current company setting, then es/UTC if absent. The migration
preserves existing explicit values, including es and UTC, because their intent
cannot be inferred. New accounts inherit; existing users can restore inheritance
in Preferences. Currency remains company-owned and may be pending.
