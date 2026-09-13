# GEEDYX - Database

## Ownership and migrations

PostgreSQL is the source of truth. Only the NestJS API accesses it through
Prisma. Every schema change uses a reviewed Prisma migration; the Next.js admin
application never reads it directly.

The current schema contains `Installation`, `Company`, `User`, `Role`,
`Permission`, `UserRole`, `RolePermission`, `Category` and `Product`.
`Installation` is a singleton that closes bootstrap permanently; every user
and role belongs to the one configured company.

## Implemented identity foundation

| Model | Purpose |
| --- | --- |
| `Installation` | Immutable singleton recording the completed installation, company and owner. |
| `Company` | The legal and operational business configured during installation. |
| `User` | Internal credential identity; it belongs to one company. |
| `Role`, `Permission`, `UserRole`, `RolePermission` | Explicit RBAC relations enforced by NestJS on every private operation. |

The installation transaction creates all three records together. The migration
also preserves pre-existing development users by assigning them to a legacy
company and writing the installation singleton, so setup does not reopen.

System roles are created per company: `OWNER`, `ADMIN`, `CATALOG_MANAGER` and
`VIEWER`. Permission codes are global, stable values: `catalog.read`,
`catalog.manage`, `users.read` and `users.manage`. The installation owner is
the only initial `OWNER`; it cannot be suspended or reassigned through the user
management API.

## Foundation data model - planned

Phase 1 introduces the following models before business modules are expanded:

| Model | Purpose |
| --- | --- |
| `FileAsset` relation for profile avatar | Optional avatar storage after the provider-neutral file model exists. |
| `Session` | Hashed opaque token, expiry, device data and revocation state. |
| `PasswordResetToken` | Hashed, one-time, short-lived recovery token. |
| `MfaFactor`, `RecoveryCode` | MFA readiness and recovery. |
| `IntegrationClient` | Hashed credential and scopes for an external store/backend. |
| `WebhookEndpoint`, `WebhookDelivery` | Signed outbound webhook configuration and delivery record. |
| `AuditEvent` | Append-only record of security and business actions. |
| `FileAsset` | Provider/key/mime/size/checksum/status; never a permanent public URL. |

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

Local filesystem storage remains suitable for development only. Production file
assets will use a provider abstraction. The default target is S3-compatible
storage, allowing S3, MinIO, Cloudflare R2 and similar services. Supabase and
Cloudinary are optional adapters. Private files are served by authorization or
short-lived signed URLs.

## Operational requirements

- Separate local, test, staging and production databases.
- E2E tests must never run against a developer's working database.
- Production backups require documented restore verification.
- Migrations run before application rollout and must be backward compatible
  during rolling deployments.
