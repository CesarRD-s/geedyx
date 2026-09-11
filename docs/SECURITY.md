# GEEDYX — Security

## Status

The initial authentication security model is **implemented** in the NestJS API
(`apps/api/src/auth`): `POST /auth/setup`, `POST /auth/login`,
`GET /auth/me` and `POST /auth/logout`. See [API.md](./API.md) for the
endpoint contract.

## Authentication flow

```text
Initial setup
      |
      v
/setup (frontend) -> POST /auth/setup (only while the User table is empty)
      |
      v
POST /auth/login -> Argon2id verify -> JWT -> HttpOnly cookie
      |
      v
GET /auth/me (JwtAuthGuard validates the session cookie)
      |
      v
Protected administration endpoints
```

The web application exposes the first-run experience at `/setup` (a form for
username/email/password) which calls `POST /auth/setup`. The backend remains the
single authority: it creates the administrator only while the `User` table is
empty, sets the HttpOnly session cookie on success, and returns `403` when the
installation is already configured. The frontend treats that `403` as an
expected state ("already configured") and routes the visitor to `/login`; no
`/auth/status` endpoint was added — the API's existing response is the source
of truth.

The `/setup` page is not linked from `/login`; it is reached only by direct
navigation. There is no discovery path that exposes the bootstrap route in the
normal login flow (as of CP12.2).

## Implemented security measures

### Password hashing (Argon2id)

- Passwords are hashed with **Argon2id** (`argon2.hash`, type `argon2id`).
- The plaintext password is never stored and never logged.
- `passwordHash` is never returned by any endpoint.

### JWT

- A short-lived JWT carries only `sub` (user id) and `email`; no passwords or
  other sensitive data.
- The JWT is signed with `JWT_SECRET`, read from the API environment
  (`apps/api/.env`, never committed, never exposed to the frontend).
- The token is validated on protected routes by the JWT strategy + `JwtAuthGuard`.

### HttpOnly cookies

- The JWT is delivered to the browser in the `geedyx_session` HttpOnly cookie.
- The cookie is `HttpOnly` (not readable by JavaScript), `SameSite=Lax`,
  `Path=/`, and has an explicit lifetime matching the JWT.
- `Secure` is enabled via `COOKIE_SECURE=true` when the API is served over
  HTTPS.
- The JWT is never returned in a JSON response and is never written to
  localStorage.

### Setup locking

- `POST /auth/setup` creates the first administrator only while the `User`
  table is empty (checked in the service immediately before creating the user).
- Once a user exists, `POST /auth/setup` returns `403 Forbidden` and can never
  create additional users.

### Login failure behavior

- Invalid credentials return `401 Unauthorized`.
- The same response is used for an unknown email and a wrong password, so the
  endpoint does not reveal whether an email exists.

### Rate limiting

- The API applies global in-memory rate limiting (`@nestjs/throttler`,
  default 100 requests/minute per route).
- `POST /auth/login` and `POST /auth/setup` are limited more strictly
  (5 requests/minute) to slow down brute force attempts.
- Storage is in memory per API process; no Redis or extra infrastructure is
  required in the MVP. This choice is recorded in
  [DECISIONS.md](./DECISIONS.md) (ADR-021).
- The API refuses to start when `JWT_SECRET` is missing or empty (an empty
  string is a *present* value for the config service, so `getOrThrow` alone
  would not catch it). This prevents signing tokens with an empty secret.
- When the API runs behind a reverse proxy, set `TRUST_PROXY=true` so rate
  limiting is keyed on the real client IP (`X-Forwarded-For`) instead of the
  proxy's address.

### CORS with credentials

- CORS is configured explicitly from the `CORS_ORIGINS` environment variable
  (comma-separated allowed origins, default `http://localhost:3000`).
- `credentials: true` is enabled, so cookies are sent, but only from the
  configured origins. There is no wildcard origin.

### Input validation

- All auth input is validated with DTOs + `class-validator` through a global
  `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`).
- Unknown properties are rejected.

### Public reads never expose inactive products

- The public product catalog (`GET /products`, `GET /products/:id`,
  `GET /products/slug/:slug`) accepts requests with or without a session cookie
  (`OptionalJwtAuthGuard`).
- Anonymous requests only ever see `isActive = true` products; the `isActive`
  query filter is ignored without a valid cookie.
- `GET /products/:id` is auth-aware since checkpoint 09: a valid admin session
  may read the detail of inactive products (needed by the admin editor);
  anonymous callers still get `404`. `GET /products/slug/:slug` remains
  public-only (`404` for inactive) and the public list never exposes inactive
  products except when an authenticated admin filters by `isActive`.
  See ADR-025 and `docs/API.md` (Products).

### Image uploads

- Upload/delete of product images requires a valid session cookie
  (`JwtAuthGuard`); there is no anonymous upload path.
- Only JPEG, PNG and WebP are accepted (MIME whitelist). SVG is explicitly
  rejected to reduce the stored-content (active content) attack surface.
- The client-provided MIME type is never trusted on its own: file content is
  sniffed against real magic bytes before the file is stored.
- A server-side size limit applies (default `5 MB`, `MAX_IMAGE_SIZE_MB`),
  enforced both by the multipart parser (`413` on overflow) and validated again
  in the service.
- Stored filenames are generated server-side (random UUID). Client filenames
  are never used on disk, so path traversal attempts cannot escape the upload
  directory.
- Image URLs are server-relative public paths (`/uploads/products/...`); the
  API never returns absolute filesystem paths.
- Deleting a product (or its image) also deletes the stored file.

## Production security checklist

The following checklist should be reviewed before a production deployment:

- [ ] `JWT_SECRET` is a strong random value (e.g. `openssl rand -hex 32`) and is
      only in the server environment, never in the frontend or in Git.
- [ ] `COOKIE_SECURE=true` and the API is served over HTTPS.
- [ ] `CORS_ORIGINS` lists only the real frontend origin (no wildcard with
      credentials). The frontend origin is also served over HTTPS.
- [ ] `DATABASE_URL` is a scoped, secure connection (no default passwords);
      `POSTGRES_PASSWORD` in `docker-compose.yml` is a dev-only value.
- [ ] `TRUST_PROXY=true` is set when the API sits behind a reverse proxy so
      rate limiting and request IPs are correct.
- [ ] Uploads: `UPLOAD_DIR` points to a persistent filesystem; the default size
      limit (`MAX_IMAGE_SIZE_MB`) is confirmed; validation (MIME whitelist,
      magic bytes, size) is enabled server-side (it always is).
- [ ] PostgreSQL backups are configured.
- [ ] No secrets are committed; `.env`/`.env.local` are gitignored. Backend
      secrets are never prefixed with `NEXT_PUBLIC_`.
- [ ] Logs do not contain passwords, JWTs or internal error details.
- [ ] The admin bootstrap (`/auth/setup`) is completed once; after the first
      administrator exists, the endpoint is permanently locked (`403`).

No advanced infrastructure (WAF, rate-limit stores, secrets vaults, SSO) is
considered part of the MVP; the checklist above covers the production baseline.

## Scope (intentionally not implemented)

- No public registration, roles, permissions, or multi-user administration
  (see ADR-008).
- No refresh tokens in the MVP: a single short-lived JWT in a cookie, with no
  server-side session store (see ADR-019).
- No 2FA, password recovery, or email verification yet.

## Security principles

The following principles apply to all implementation work:

- Passwords use Argon2.
- Authentication uses secure HttpOnly cookies (not localStorage).
- Never store authentication tokens in localStorage.
- Never expose secrets to the frontend (no `NEXT_PUBLIC_*` backend secrets).
- Backend secrets stay in the NestJS application environment.
- Protected endpoints must require authentication.
- Validate all user input.
- Validate file uploads.
- Configure CORS explicitly.
- Authentication endpoints are rate limited.

## Related

- [API.md](./API.md)
- [DECISIONS.md](./DECISIONS.md)
- [AGENTS.md](../AGENTS.md)