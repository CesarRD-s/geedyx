# GEEDYX - Security

## Security posture

GEEDYX manages private business data. Security controls are enforced by the
NestJS API; the browser and external stores are untrusted clients. Browser
authentication uses persistent opaque sessions whose raw values never enter the
database.

## Phase 1 security baseline

### Installation and internal identity

- Setup is completed atomically with the provisional company, first owner and
  session. It is unavailable as soon as the installation singleton exists.
- A persisted installation state prevents setup from reopening if users change.
- Passwords use Argon2id with explicit parameters and rehashing when needed.
- Password reset tokens are random, single-use, short-lived and stored hashed.
- Account status, password change time, failed login events and MFA readiness
  are server-side state.
- MFA is required for privileged roles before production financial operations.

### Sessions

- Browser sessions are random opaque tokens; only a token hash is persisted.
- Cookies are `HttpOnly`, `Secure` in production, host-only, `Path=/` and
  `SameSite=Lax` unless a reviewed use case requires another policy.
- Sessions have idle and absolute expiry, rotation, logout revocation and a
  “revoke other devices” action.
- Login enforces the configured per-user session limit by revoking only the
  oldest sessions that exceed capacity. Existing sessions remain valid while
  capacity is available.
- Password, email, MFA and privilege changes require reauthentication and revoke
  affected sessions.
- Secrets, passwords, raw session values and reset tokens are never logged.

### Authorization and APIs

- Every private endpoint has an explicit permission check.
- Integration credentials are hashed, scoped, rate-limited, rotated and
  independently revoked.
- Browser-originated mutations validate the allowed origin and apply CSRF
  protection. CORS is never authorization.
- Public endpoints are allowlisted, read-only, rate-limited and reveal only
  published catalog fields.
- Inputs use allowlist DTO validation; IDs and company ownership are checked on
  every read and mutation to prevent object-level authorization failures.

### Files, webhooks and operations

- Files are size-limited, MIME and magic-byte validated, named by the server,
  authorization-protected and quarantined/scanned when documents are supported.
- Inbound webhooks verify raw-body signatures, timestamps and duplicate event
  IDs before writes.
- Security headers, HTTPS, body limits, safe error responses and request IDs are
  configured at the edge/API.
- Audit events record authentication, session, authorization, configuration and
  later financial/inventory actions; audit data is append-only.
- Production uses backups with tested restoration, dependency updates, secret
  management, monitoring and alerts.

## Threats that drive the design

Bootstrap takeover, credential stuffing, session theft/fixation, CSRF, XSS,
privilege escalation, object-level authorization failures, upload abuse, webhook
forgery/replay, duplicate payment/order writes, data loss and secret leakage are
first-class threats. Each new domain documents its threat model before release.

## Current controls and limitations

Implemented controls include Argon2id hashing, opaque sessions stored as token
hashes, HttpOnly cookies, idle and absolute session expiry, session limits,
logout revocation, CSRF validation for browser mutations, CORS allowlist, DTO
validation, in-memory throttling, validated image uploads, fail-fast runtime
configuration validation and safe API error responses. Installation writes the
provisional company, owner and immutable installation state in one transaction.
Requests receive correlation IDs and structured access logs. Every current
category and product endpoint requires authentication; no catalog route is
anonymously exposed.

Current authorization is role and permission based. Permission checks read the
current account status and role assignments on each protected request; a JWT
does not carry authoritative permissions. Suspended accounts cannot log in or
continue using protected resources. The installation owner cannot be suspended
or stripped of its role by the user-management API.

These controls do not yet provide MFA, audit events, integration credentials or
durable multi-instance rate limiting. Password reset storage is ready but its
delivery flow and reauthentication for sensitive actions remain planned.
