# GEEDYX - API

## Contract policy

GEEDYX exposes a REST API for its private admin console and for approved
external-store integrations. The API is the only access path to business data.

Every maintained endpoint is served below `/api/v1`. The earlier unversioned
prototype routes were removed before they became a compatibility contract.

OpenAPI is the generated, authoritative development contract. With
`OPENAPI_ENABLED=true`, Swagger UI is available at `/api/docs` and its JSON
document at `/api/docs-json`. Human guides explain policy but do not replace the
generated specification.

## API surfaces

| Prefix | Consumer | Authentication | Purpose |
| --- | --- | --- | --- |
| `/api/v1/*` | GEEDYX internal workspace | Internal server-side session + permissions | Private business resources; each operation enforces its permission. |
| `/api/v1/commerce/*` | Store backend or connector | Scoped integration credential | Orders, customer sync and approved operational reads. |
| `/api/v1/public/*` | Storefront browser | Anonymous, read-only | Explicitly published catalog data only. |
| `/api/v1/webhooks/*` | Payment/fiscal/commerce providers | Verified provider signature | Inbound events; never browser sessions. |

No secret integration credential is sent to a storefront browser. A browser may
consume only intentionally public, rate-limited data.

## Versioning and compatibility

- Version is in the URI: `/api/v1/...`.
- Additive changes within a major version are preferred.
- Breaking changes require a new major version, migration guide and announced
  deprecation period.
- Deprecated endpoints remain documented with removal dates.
- Requests and responses use UTF-8 JSON, ISO 8601 UTC timestamps and stable
  opaque IDs.

Temporal contracts distinguish values that represent different concepts:

- calendar dates use `YYYY-MM-DD` and never imply UTC or a time zone;
- local wall-clock times use 24-hour `HH:mm` at minute precision;
- date ranges use inclusive `start` and `end` calendar dates, with `start <= end`;
- instants use ISO 8601 UTC strings ending in `Z`.

An endpoint must name and document which contract each field uses. It must not
parse a calendar date as midnight UTC or accept an ambiguous local date-time.
At a local-input boundary, the client combines `YYYY-MM-DD`, `HH:mm` and an
explicit IANA time zone. A valid unique result is submitted as canonical UTC
with millisecond precision, for example `2026-09-13T15:30:00.000Z`. A daylight
saving gap or overlap is a validation result and requires correction or an
explicit product decision; the boundary never chooses an offset silently.

## Current endpoints

- `GET /api/v1/health/live` reports process liveness.
- `GET /api/v1/health/ready` checks API readiness, including PostgreSQL.
- `GET /api/v1/auth/installation` returns the public, non-sensitive
  installation state used by the first-run screen.
- `POST /api/v1/auth/setup` creates a provisional company, initial owner and
  opaque browser session in one transaction. It requires `username`, `email`,
  `password` and `confirmPassword`; it is permanently unavailable after
  installation.
- `POST /api/v1/auth/login` and `POST /api/v1/auth/logout` create and revoke
  opaque sessions; `GET /api/v1/auth/me` requires its
  HttpOnly session cookie and returns the current profile and effective
  permissions.
- `PATCH /api/v1/auth/profile` lets an authenticated user update only their
  display name, preferred language (`es` or `en`) and time zone.
- `GET /api/v1/auth/sessions`, `POST /api/v1/auth/sessions/:id/revoke` and
  `POST /api/v1/auth/sessions/revoke-others` manage the authenticated user's
  sessions. `POST /api/v1/auth/password/change` requires the current password.
- `POST /api/v1/auth/reauthenticate` verifies the current password and marks
  only the current server-side session as recently authenticated. It rotates
  that session's opaque and CSRF credentials without extending its absolute
  expiry. It returns `reauthenticatedUntil`; an invalid password is `401`.
- Sensitive mutations return `403` when the current session has no recent
  authentication. P1.4b initially applies this boundary to company settings and
  internal-user creation or updates.
- `POST /api/v1/auth/password/reset-request` accepts an email address and always
  returns `202` with no account details. When the active account exists, the API
  replaces its older unused tokens and asks the configured delivery adapter to
  send one short-lived link.
- `POST /api/v1/auth/password/reset` accepts the raw token and a new password.
  A successful transaction consumes the token, changes the password and revokes
  every active browser session. Invalid, expired and used tokens share the same
  `400` response.
- MFA has no API endpoint yet. The database can represent pending, verified and
  revoked TOTP factors plus one-use recovery-code hashes, but P1.4c intentionally
  exposes no partial enrollment, challenge or recovery flow.
- Authentication and recovery endpoints can return `429 RATE_LIMITED`. Their
  critical counters are persisted in PostgreSQL and keyed by hashed IP plus a
  hashed account, session or token subject as applicable.
- Installation, login, logout, password recovery, password changes,
  reauthentication, session revocation, internal-user changes and company
  settings changes produce immutable audit events with the request ID and
  outcome. Permission, suspended-account and recent-authentication denials also
  produce events. Raw passwords, reset tokens, session values and CSRF values
  never enter audit metadata. Audit records have no read API yet.
- Category and product creation, updates and deletion also produce immutable
  audit events. The existing prototype image operations are deferred with the
  future private file-storage foundation.
- Every non-safe request authenticated by a browser session must send an
  `Origin` that exactly matches `CORS_ORIGINS` and the current CSRF token in
  `X-CSRF-Token`. Successful password changes also rotate both credentials
  without extending the session's absolute expiry.
- `/api/v1/categories` and `/api/v1/products` expose the current CRUD and image
  operations. Reads require `catalog.read`; mutations require `catalog.manage`.
- `GET /api/v1/users` and `GET /api/v1/users/roles` require `users.read`.
  `POST /api/v1/users` and `PATCH /api/v1/users/:id` require `users.manage`.
  User operations are constrained to the authenticated user's company.
- `GET /api/v1/company/settings` reads the optional company defaults for the
  authenticated company. `PATCH /api/v1/company/settings` requires
  `company.manage` and accepts `name`, `locale` (`es` or `en`), `timeZone` and
  `currency` (`HNL`, `USD`, `MXN`, `COP` or `EUR`).

There is currently no anonymous catalog API. Future storefront reads will be
explicitly added below `/api/v1/public`; private resource routes will not be
made conditionally public.

## Current conventions

- Product lists accept `page` (default 1), `limit` (default 20, maximum 100),
  `search`, `categoryId`, `isActive`, `sort` and `order`. `sort` accepts `name`,
  `price`, `stock` or `createdAt`; `order` accepts `asc` or `desc`.
- Validation strips no unknown intent silently: unknown DTO properties are
  rejected. This limits mass assignment.
- Every request receives an `X-Request-ID` response header. A valid client
  request ID may be supplied in `X-Request-ID`; otherwise the API generates one.
- Application logs include request ID, method, path, status and duration.
- Errors use the safe envelope below and do not expose stack traces:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": ["field must be a string"],
  "requestId": "c667b638-0602-494f-8704-c7351daab876",
  "timestamp": "2026-09-12T20:00:00.000Z",
  "path": "/api/v1/products"
}
```

Stable current codes are `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`,
`NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE` and
`INTERNAL_ERROR`. Other HTTP failures use `HTTP_ERROR` until assigned a more
specific contract code.

## Current authorization

Permissions are looked up from current database roles for every protected
request; they are never trusted from a browser cookie. Suspended accounts cannot log in
or use an existing protected session. The system roles are `OWNER`, `ADMIN`,
`CATALOG_MANAGER` and `VIEWER`; their effective access is described in the API
documentation generated at `/api/docs`.

## Conventions still planned

The effective account context will resolve language and time zone from the user
override or company default. Base currency remains company-wide. A persisted
language preference is not a translated interface until `es` and `en` catalogs
are implemented across API and web.

- Mutation endpoints that may be retried accept `Idempotency-Key`; its result is
  stored and replayed for the same authenticated actor and operation.

## Webhooks - planned

Outbound deliveries include an event ID, timestamp, signed payload and retry
record. Consumers deduplicate by event ID. Inbound providers are verified against
their raw request body and provider signature before any business write occurs.

The current authentication and business endpoints remain internal prototype
behavior. They are not an integration contract for a third-party store.

## Regional context (P1.4a.2)

Authentication responses include `regionalContext`: effective `locale`, `timeZone`,
`timeZoneSource` (`user`, `company`, `system`), `companyTimeZone` and company
`currency` (nullable). Raw user `locale` and `timeZone` are nullable overrides.
`PATCH /auth/profile` accepts null to restore inheritance; omitted fields stay
unchanged. Time zones must be valid IANA identifiers. User administration no
longer accepts personal locale or time zone. All paths use `/api/v1`.
