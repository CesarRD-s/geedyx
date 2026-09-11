# GEEDYX — Architecture

## Overview

GEEDYX is a monorepo with two separate applications and a shared PostgreSQL
database.

```text
Browser
   |
   v
Next.js Web
   |
   | REST
   v
NestJS API
   |
   v
Prisma
   |
   v
PostgreSQL
```

- Next.js and NestJS are separate applications.
- The Next.js web application does not access PostgreSQL directly.
- The NestJS API owns business logic and database access.
- Frontend/backend communication uses REST over HTTP.
- Prisma is the ORM/data access layer, owned by the NestJS API.
- PostgreSQL is the primary database.

## Data layer

The `User`, `Category` and `Product` models are part of the API/database layer:

- they are defined in the Prisma schema
  (`apps/api/prisma/schema.prisma`) and owned exclusively by the NestJS API;
- the Next.js application never reads or writes them directly — it will access
  them only through the future REST endpoints;
- the domain models exist at the data layer; application features around them
  (authentication, CRUD, catalog) are implemented in later checkpoints.
  Authentication, category CRUD and product CRUD are implemented (see below).

```text
Next.js
   |
 REST
   |
NestJS
   |
Prisma
   |
PostgreSQL
```

## Authentication flow

Authentication lives in the NestJS API (`apps/api/src/auth`) following the
standard layering: `AuthController` (HTTP) → `AuthService` (business logic) →
`PrismaService` → PostgreSQL, with a Passport JWT strategy and guard for
protected routes.

```text
Browser                             NestJS API
   |  POST /auth/login                  |
   |  { email, password } ------->      | AuthService.verify (Argon2id)
   |                                    | JwtService.sign -> JWT
   | <---- Set-Cookie: geedyx_session   | HttpOnly + SameSite=Lax
   |                                    |
   |  GET /auth/me + Cookie ----->      | JwtAuthGuard -> JwtStrategy
   |                                    | (JWT from cookie, signature check)
   | <---- { id, username, email }      |
```

Key points:

- The session is a stateless JWT in an HttpOnly cookie; there is no server-side
  session store.
- The Next.js app and browser retain the cookie automatically; the JWT is never
  exposed to JavaScript.
- CORS (`credentials: true`, origins from `CORS_ORIGINS`) allows the browser to
  send the cookie from the configured frontend origin.
- Rate limiting is applied globally and more strictly on the auth endpoints.

See [SECURITY.md](./SECURITY.md) for the full security details.

## Web application (Next.js)

`apps/web` (Next.js 16 App Router) owns the user interface only. It never talks
to PostgreSQL; all data comes from the NestJS API over REST. The API origin is
configured once in `NEXT_PUBLIC_API_URL` (`apps/web/.env.example`); no component
hardcodes a host.

```text
Browser / Next.js                          NestJS API
   |  POST /auth/login (credentials)  -->  |  sets/clears HttpOnly cookie
   |  POST /auth/logout (credentials)      |  (browser <-> API directly)
   |                                       |
   |  GET /admin (Server Component)        |
   |       `getSession()`                  |
   |       forwards geedyx_session ----->  |  GET /auth/me (session check)
```

Session handling:

- **Login/logout** are direct browser → API requests with `credentials:
  "include"`, so the backend itself sets and clears the HttpOnly
  `geedyx_session` cookie. The frontend (client JS) never reads, copies or
  stores the JWT; nothing is kept in `localStorage`/`sessionStorage`.
- **Route protection** is server-side. The `lib/api/server.ts` data-access
  layer (`getSession`) reads the cookie through `cookies()`, calls `GET
  /auth/me` forwarding it, and treats `401` as unauthenticated. Layouts and
  pages under `/admin` call `requireSession()` and `redirect('/login')` when
  there is no session. Pages re-verify on every render because layouts do not
  re-run their checks on partial (client-side) navigation.
- No auth library, no Next.js-level sessions, no refresh tokens. The API is the
  single source of truth for the session.
- The typed `lib/api` layer centralizes the base URL, `credentials` handling,
  JSON/error parsing (`ApiError`), and common status mapping, so fetch calls
  are not duplicated across components. TypeScript is strict and `any` is never
  used.

Admin data on the dashboard is read-only REST: product total/active/inactive
come from authenticated `GET /products` page metadata (`meta.total`, with the
`isActive` filter honored because a session cookie is forwarded) and the
category count from `GET /categories`. The planned `/dashboard/stats` endpoint
is not required for the v1 dashboard.

### Categories management (checkpoint 08)

The categories section (`/admin/categories`) is the first real web CRUD over
the existing API (no backend changes). The page is a Server Component that (1)
calls `requireSession()` and (2) loads the list through `getCategories()`
(`lib/api/server.ts`); a load failure renders the shared error boundary instead
of raw messages.

Interactivity lives in client components under `components/categories/*`:
search filters the already-loaded list in memory (case-insensitive, no debounce,
no server round-trip), and mutations (create/update/delete) are direct
browser → API requests via `lib/api/client.ts` (`clientFetch` with
`credentials: "include"`). After a successful mutation the list refreshes from
`GET /categories` without a full page reload; the API stays the single source
of truth for ordering and the generated slug.

Following the project rule "avoid premature abstractions", components are
category-specific (form dialog, delete dialog, a small shared `Modal`, `ui.ts`
class strings) — there is no generic CRUD/table/modal framework yet. Form
validation is manual (required, trim, ≤ 80 chars; `zod` was not added). The UI
maps API errors by status: `409` becomes a friendly "duplicate name" or
"products still associated" message; other statuses fall back to neutral
Spanish messages defined in `lib/api/http.ts`. Raw backend/internal messages
(including Prisma codes) are never exposed to the user.

### Products management (checkpoint 09)

`/admin/products` is the second web CRUD section and follows the same shape as
categories, but every list condition is part of the URL (search, category,
status, sort, order, limit, page), so the same view survives refresh and
back/forward navigation:

- The **Server Component page** calls `requireSession()` and, in parallel
  (`Promise.all`), `getCategories()` and `getProducts(parseProductQuery(
  searchParams))`. `parseProductQuery` (`lib/products/query.ts`) validates and
  normalizes the raw search params (page ≥ 1, limit restricted to 10/20/50,
  sort/order whitelists, trimmed capped search); `productQueryToSearchParams`
  serializes a query back into the URL.
- **`ProductsView`** (client) renders the toolbar, table/mobile list, and keeps
  local UI state in sync with the URL through React's "adjust state during
  render" pattern (a `prevQueryKey` guard re-derives local controls when the
  server query changes), avoiding effect-driven cascading renders. Search is
  debounced 400 ms (`router.replace`, so typing does not fill history); the
  other controls use `router.push`. Filter/page/sort clicks always navigate
  with `page: 1`, except explicit pagination.
- **Mutations** are direct browser → API requests via `lib/api/client.ts` and
  always finish with `router.refresh()` so the Server Component re-fetches the
  page against the API (single source of truth). Deleting the last row of a
  page clamps back one page via the same URL navigation. Banner feedback
  (success/error) auto-dismisses after 4 s.
- **Editing an inactive product** works because the edit dialog fetches the
  detail through `getProduct(id)` and the API's `GET /products/:id` is
  auth-aware (see the Products section below).
- **Image operations** (upload/replace/delete) go to
  `POST/DELETE /products/:id/image` as `FormData`; `clientFetch` skips the
  `Content-Type` header when the body is `FormData` so Multer parses the
  boundary correctly. A failed upload after a successful save degrades to a
  banner and never fails the product. Client-side pre-validation (MIME +
  ≤ 5 MB) mirrors the backend limits; the 413 mapping comes from the API.
- **Currency**: `formatPrice` mirrors the API's plain-number prices into an
  `es-MX` + USD `Intl.NumberFormat`; image URLs are API-relative and prefixed
  with the API base URL at render time. No new dependencies were added; the
  shared `Modal` and class-string helpers were promoted to `components/ui/` and
  both sections import from there.

### Public catalog (removed in CP12.2)

`/` and `/products/[slug]` previously rendered a public storefront as
unauthenticated Server Components. This was removed in CP12.2: GEEDYX is a
private admin application with no public views. The root `/` page now reads
the session (server-side) and redirects to `/admin` or `/login`.

The backend product read endpoints (`GET /products`, `GET /products/:id`,
`GET /products/slug/:slug`) remain in the NestJS API and are still public-
read (AADR-025/026); the removal only affects the web-facing catalog pages.

**Product images render with a native `<img>`** (not `next/image`). The images
live on the API origin (`NEXT_PUBLIC_API_URL` + `/uploads/…`), whose host is an
environment value, so `next/image` would need a brittle runtime
`remotePatterns`/loader configuration and fixed dimensions. Since the MVP
serves small, server-validated images (≤ 5 MB, immutable cache headers), a
native `<img>` with explicit `alt` and a fallback placeholder is the kept
decision (see UI.md); the three `@next/next/no-img-element` lint warnings are
accepted, not silenced.

## Categories

The `CategoriesModule` (`apps/api/src/categories`) is the first CRUD feature and
establishes the module pattern for future features (e.g. products):
`CategoriesController` (HTTP) → `CategoriesService` (business logic) →
`PrismaService` → PostgreSQL.

```text
Browser                             NestJS API
   |  GET /categories                     |
   |  GET /categories/:id                 | CategoriesService (read)
   |  GET /categories/slug/:slug          |   public, no auth
   |                                      |
   |  POST/PATCH/DELETE + Cookie -------> | JwtAuthGuard
   |                                      | CategoriesService (write)
```

Key points:

- Read endpoints are public; mutating endpoints are guarded with the same
  `JwtAuthGuard` used by `/auth/me`. The guard is exported from the
  `AuthModule` and the module is marked `@Global()`, so its protected routes
  (and passport options) are available to any module without duplicating
  registration.
- The `slug` is always derived from the `name` on the server (a pure utility in
  `slug.ts`, no library). The database keeps a unique constraint on `slug`, and
  the service both pre-checks and translates unique-constraint violations
  (`P2002`) into `409 Conflict` responses to stay correct under races.
- Deleting a category with products is rejected (`409 Conflict`). The service
  pre-checks the product count and also translates the database violation
  (`P2003`/`P2014`) that enforces `ON DELETE RESTRICT` — there is no cascade.
- Responses return only `{ id, name, slug }`; no pagination, filters, soft
  delete, or extra category fields exist yet.

## Products

`ProductsModule` (`apps/api/src/products`) follows the same pattern:
`ProductsController` (HTTP) → `ProductsService` (business logic) →
`PrismaService` → PostgreSQL.

```text
Browser                             NestJS API
   |  GET /products (public)            |
   |  GET /products/:id                 | ProductsService (read)
   |  GET /products/slug/:slug          |   OptionalJwtAuthGuard
   |                                    |
   |  POST/PATCH/DELETE + Cookie -----> | JwtAuthGuard
   |                                    | ProductsService (write)
```

Key points:

- Read endpoints are public. `GET /products` and `GET /products/:id` use an
  `OptionalJwtAuthGuard` (decorates the standard `JwtAuthGuard`, letting the
  request through without a cookie) so the public catalog is always visible;
  this guard is provided/exported by the `@Global()` `AuthModule`. Anonymous
  requests always see only active products (`isActive = true` is forced and the
  `isActive` query filter is ignored), and `GET /products/:id` is auth-aware:
  anonymous callers get a `404` for inactive products, while a request carrying
  a valid admin session can read inactive detail (needed by the admin editor).
  `GET /products/slug/:slug` always requires an active product.
- Prices: Prisma 7 returns PostgreSQL `NUMERIC(10, 2)` values as a
  `runtime.Decimal` (decimal.js). The service maps rows to API objects using
  `row.price.toNumber()` so JSON always carries a plain number (≤ 2 decimals),
  and converts inbound numbers to the exact `price.toFixed(2)` string on writes
  (see ADR-023).
- The service returns a fixed `ProductDetailRow`/`ProductListItemRow` based on
  explicit Prisma `select` objects. List items include `lowStockThreshold` and
  `imageUrl` (added in checkpoint 09, with the matching exact-key e2e
  assertion) but exclude `description` to stay light; the detail row includes
  everything.
- Slug conflicts use a deterministic numeric suffix (`-2`, `-3`, …) instead of
  a random suffix and are resolved by an `findAvailableSlug` pre-check plus a
  bounded retry loop on the `P2002` unique-constraint violation (`meta.target`
  distinguishes `slug` from `sku`; only the slug is retried). See ADR-024.
- The list runs count + search inside a `prisma.$transaction([...])` so `total`
  is consistent with the returned page.
- Product images are handled by two authenticated endpoints,
  `POST /products/:id/image` (upload/replace) and `DELETE /products/:id/image`,
  plus cleanup when a product is deleted. Uploads are validated by
  `ProductsService` (size, allowed MIME, magic-byte content sniffing) and
  stored through the `ImageStorage` abstraction (see Storage below). The
  `file` itself is parsed by Multer via `FileInterceptor`.

## Storage

Product images are stored externally from the database. The database stores the
relative public URL (e.g. `/uploads/products/<uuid>.png`), never the binary.

For the MVP, images are stored on the local filesystem under `UPLOAD_DIR`
(default `uploads/`). The `ImageStorage` interface (`apps/api/src/images`),
provided by `ImagesModule` under the `IMAGE_STORAGE` token, owns `save`,
`delete` and `exists`, and operates exclusively on public URLs. The MVP
implementation, `LocalImageStorage`, maps URLs to files below `UPLOAD_DIR` with
a strict path guard, so storage can later migrate to Supabase Storage or S3
without touching product logic (ADR-006, ADR-007):

```text
ProductsService
    |
    v
ImageStorage (interface, IMAGE_STORAGE)
    |                                        static /uploads/*
    +-- LocalImageStorage (MVP) ----------> GET served by Express (cache: immutable, 1y)
    |
    +-- Supabase Storage (future)
    |
    +-- S3               (future)
```

Uploaded filenames are generated server-side (UUID), never taken from client
input. The static `/uploads/` route is mounted in `main.ts` (and must be
mounted in tests too) so browsers can load the images with long-lived, content
immutable cache headers.

Local filesystem storage is an explicit MVP decision (ADR-006, ADR-007). It
works for development, a single-host MVP and any environment with a persistent
filesystem, but it is **not** appropriate where the filesystem is ephemeral
(serverless, stateless containers, multi-node deployments). Migrating the
`ImageStorage` interface to Supabase Storage or S3 is a future phase and is
intentionally not done in the MVP; `UPLOAD_DIR` must point to persistent
storage in production.

### Runtime configuration (API bootstrap)

`apps/api/src/main.ts` reads the environment through the config service:
`PORT`, `CORS_ORIGINS` (explicit origins, `credentials: true`, never a
wildcard) and `TRUST_PROXY` (`true` enables Express trust proxy so the
`@nestjs/throttler` rate limiter keys on the real client IP when the API sits
behind a reverse proxy). `COOKIE_SECURE`, `JWT_EXPIRES_IN` and the image limits
are documented in `apps/api/.env.example`.

## Applications

### apps/web — Next.js

Frontend application. Server-rendered with the App Router, Tailwind CSS, and
strict TypeScript. Handles both the public catalog and the administration
console.

### apps/api — NestJS

Backend API. Owns business logic and data access. Organizes code by business
domain. Controllers handle HTTP concerns; services contain business logic.
Prisma provides database access through a global `PrismaService`
(see [DATABASE.md](./DATABASE.md)).

### Deployment notes

The MVP deploys as two standard Node.js services plus PostgreSQL; no provider
is assumed. The web app needs `NEXT_PUBLIC_API_URL`; the API needs
`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `COOKIE_SECURE=true`, and, on a
host behind a reverse proxy, `TRUST_PROXY=true`. Migrations are applied with
`pnpm db:migrate:deploy`. Full instructions, the storage limitation and the
production security checklist live in the [README](../README.md) and
[SECURITY.md](./SECURITY.md). No Docker image for the apps is provided yet —
the services are long-running Node processes with a persistent filesystem for
uploads.

## Design principles

- Modular but not over-engineered.
- No microservices.
- No unnecessary dependencies.
- Abstractions are introduced only when there is a concrete requirement
  (see [DECISIONS.md](./DECISIONS.md)).
- Authentication and CRUD for categories and products are implemented; product
  image upload/replace/delete, the admin UI (CP7–CP9), the dashboard counts
  and the MVP hardening pass (CP11) are implemented; the Design System and UI
  refinement (CP12) established the visual foundation. The public catalog
  (CP10) was removed in CP12.2 — GEEDYX is a private admin application with
  no public views. Inventory movements and the advanced statistics remain
  planned (V1).

## Related

- [PRODUCT.md](./PRODUCT.md)
- [DATABASE.md](./DATABASE.md)
- [API.md](./API.md)
- [SECURITY.md](./SECURITY.md)
- [DECISIONS.md](./DECISIONS.md)