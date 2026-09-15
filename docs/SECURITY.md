# GEEDYX - Security

## Security posture

GEEDYX manages private business data. Security controls are enforced by the
NestJS API; the browser and external stores are untrusted clients. Browser
authentication uses persistent opaque sessions whose raw values never enter the
database.

## Phase 1 security baseline

### Installation and internal identity

- Setup is completed atomically with the provisional company, four system
  roles, first owner and session. It is unavailable as soon as the installation
  singleton exists.
- A persisted installation state prevents setup from reopening if users change.
- Passwords use Argon2id with explicit parameters and rehashing when needed.
- Password reset tokens are random, single-use, short-lived and stored hashed.
- Password-reset requests return the same accepted response for existing,
  missing and suspended accounts. Raw tokens exist only long enough to pass a
  reset URL to the delivery adapter; they are never returned by the API or
  written to logs. Successful consumption revokes every browser session.
- Setup, login, password confirmation and recovery endpoints consume durable
  PostgreSQL rate-limit buckets. IP and account/token subjects are hashed before
  storage; limits survive process restarts and apply across API instances.
- Account status, password change time, failed login events and MFA readiness
  are server-side state.
- User invitations and email changes use separate random, single-use,
  short-lived hashed tokens. An invited account has no password and cannot log
  in before accepting its invitation. Email changes require recent
  authentication to request and revoke every active session on confirmation.
- MFA is required for privileged roles before production financial operations.
- MFA-ready storage never has a plaintext-secret column. Future TOTP enrollment
  must encrypt secrets with AES-256-GCM under a versioned key outside the
  database, bind ciphertext to its user and factor as authenticated data, and
  store recovery codes only as Argon2id hashes.

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
- A successful login starts the recent-authentication window for that session.
  `POST /auth/reauthenticate` can renew it after verifying the current password.
  The API enforces `REAUTHENTICATION_TTL` against the persisted session
  timestamp; the frontend cannot extend the window itself.
- Successful reauthentication and password changes replace both the opaque
  session token and CSRF token. Rotation retains the session's original
  absolute expiry and does not create a new session.

P1 uses one configured transactional email provider. Its initial production
adapter is Resend. Development uses a non-delivering `disabled` adapter and
never sends a security message to a real recipient by default. Provider
credentials are deployment secrets; the API records delivery outcomes without
storing the recipient address, raw message or one-time link. A suppressed or
failed recovery delivery invalidates its reset token.
- Secrets, passwords, raw session values and reset tokens are never logged.

### Authorization and APIs

- Every private endpoint has an explicit permission check.
- Integration credentials are hashed, scoped, rate-limited, rotated and
  independently revoked.
- Every session-authenticated mutation requires an exact `Origin` match against
  `CORS_ORIGINS` and a valid session-bound CSRF token. Missing, opaque (`null`)
  and unapproved origins are rejected. CORS is never authorization.
- Public endpoints are allowlisted, read-only, rate-limited and reveal only
  published catalog fields.
- Inputs use allowlist DTO validation; IDs and company ownership are checked on
  every read and mutation to prevent object-level authorization failures.

### Files, webhooks and operations

- Product images are size-limited, MIME and magic-byte validated, named by the
  server and held in private storage. The database retains only an opaque key
  and checksum; catalog responses issue short-lived HMAC-signed read URLs.
  Documents require quarantine and scanning before that file type is added.
- Inbound webhooks verify raw-body signatures, timestamps and duplicate event
  IDs before writes.
- Security headers, HTTPS, body limits, safe error responses and request IDs are
  configured at the edge/API.
- Audit events record authentication, session, authorization, configuration and
  later financial/inventory actions; audit data is append-only.
- PostgreSQL blocks modification and truncation of persisted audit rows. The
  application writes through a service that limits metadata and rejects field
  names associated with passwords, tokens, cookies and other credentials.
- Authentication, session, user-administration and company-configuration events
  retain request ID, actor, outcome and target where known. Authorization
  denials record only their stable reason and target permission, user or session.
  Unknown login and recovery identities are stored only as SHA-256 hashes.
  Successful state changes fail and roll back if their audit event cannot be
  committed in the same transaction.
- Production uses backups with tested restoration, dependency updates, secret
  management, monitoring and alerts.

## Threats that drive the design

Bootstrap takeover, credential stuffing, session theft/fixation, CSRF, XSS,
privilege escalation, object-level authorization failures, upload abuse, webhook
forgery/replay, duplicate payment/order writes, data loss and secret leakage are
first-class threats. Each new domain documents its threat model before release.

## Current controls and limitations

Implemented controls include Argon2id hashing, opaque sessions stored as token
hashes, HttpOnly cookies, idle and absolute session expiry, credential rotation,
session limits, logout revocation, exact-origin and CSRF validation for browser
mutations, CORS allowlist, DTO validation, durable authentication throttling,
validated image uploads, fail-fast runtime
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

These controls do not yet enforce MFA or expose enrollment, challenge or
recovery-code endpoints. Only the protected persistence model exists. Audit
event storage, authentication/session, current identity and company
configuration coverage are implemented. Broad domain coverage and integration
credentials remain planned.
Password reset request, delivery and
consumption boundaries are implemented; production must configure its HTTPS
delivery adapter. Recent authentication is enforced for company settings and
internal-user mutations; additional sensitive domains must adopt the same guard
when they are introduced.
