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
