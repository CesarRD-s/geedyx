# Changelog

All notable changes to GEEDYX are documented in this file. Checkpoints (CP)
are the project's staged delivery milestones; see [docs/ROADMAP.md](docs/ROADMAP.md).

## CP12.6 — GEEDYX Design System applied to the existing UI (2026-09-11)

Applies the GEEDYX Design System (CP12.5) to every existing screen and shared
component, so `/setup`, `/login` and `/admin*` feel like one product.
**Visual only**: no functionality, API, Prisma, database or contract changes;
no new dependencies.

### Changed

- **All UI migrated to canonical tokens**: every `apps/web` component now uses
  the canonical names (`text-muted`, `bg-surface-subtle`, `bg-accent*`,
  `border-border*`, `text-info-strong`, …). The CP12 aliases (`primary*`,
  `surface-muted`, `surface-elevated`, `foreground`, `muted-foreground`) were
  **removed** from `globals.css` (light and dark variable blocks and `@theme
  inline`).
- **App shell** (`admin-shell.tsx`): sidebar active item gains a 2px left-edge
  accent indicator bar (`navLinkClass` now `relative flex gap-2.5`); header
  logout is a ghost icon + text button; signed-in user shows an initial avatar
  + username + muted email; mobile drawer no longer double-draws the brand bar.
- **Tables** (`styles.ts`): `theadRowClass` now paints a `bg-surface-subtle`
  header band; row hover uses `bg-surface-subtle`. Applied to Products and
  Categories lists.
- **List toolbar** (`products-view.tsx`): container becomes a tonal
  `bg-surface-subtle` band without a container border, sub-row divided by a
  hairline `border-t border-border/60`.
- **Forms/dialogs**: `product-form-dialog.tsx` legend/checkbox/grid/helper text
  migrated; `product-image-field.tsx` and all delete dialogs migrated; dialogs
  keep `rounded-lg`.
- **Shared primitives** (`ui/`): `styles.ts`, `badge.tsx` (neutral/info tones),
  `empty-state.tsx`, `error-state.tsx`, `page-header.tsx`, `search-input.tsx`,
  `skeleton.tsx` and `dialog.tsx` migrated to canonical tokens.
- **Loading skeletons** (admin, products, categories) migrated.

### Docs

- `docs/UI.md`: CP12.6 status; alias paragraph rewritten (aliases removed);
  §12 header band, §14 nav indicator + ghost logout, §16 tonal toolbar band,
  §17 image placeholder references.
- `docs/DESIGN-TOKENS.md`: alias section rewritten — aliases no longer exist.
- `docs/DECISIONS.md`: ADR-028 note and ADR-029 status updated (aliases removed;
  pattern decisions ratified).

### Verification

- Web + API lint clean; `pnpm build` clean; API unit tests clean.
- Alias scan confirms no CP12 alias names remain in `apps/web` sources.

## CP12.5 — GEEDYX Design System v1.0 (2026-09-11)

Formalizes the visual language as a documented contract and prepares the `apps/web`
infrastructure, **without redesigning** the existing screens (`/setup`, `/login`,
`/admin*`) or touching functionality, the API, Prisma or the database.

### Added

- **Docs — identity**: `docs/BRAND.md` (monochrome GEEDYX identity, accent-independent
  wordmark, Light/Dark variants, favicon note).
- **Docs — tokens**: `docs/DESIGN-TOKENS.md` (living token reference with
  light/dark values and usage rules for colors, typography, spacing, radius,
  borders, shadows and motion).
- **Canonical tokens**: neutral (`background`, `surface`, `surface-subtle`,
  `surface-raised`), text (`text`, `text-secondary`, `text-muted`), borders
  (`border`, `border-strong`), accent (`accent`, `accent-hover`, `accent-active`,
  `accent-foreground`, `accent-muted`), semantic (`success`/`warning`/`danger`/
  `info` + `-strong`) and misc (`overlay`, `input`, `selection`, `shadow-panel`).
- **Configurable accent**: accent values centralized and swappable via
  `data-accent="indigo"` on `<html>` (example alternate palette ships in
  `globals.css`); a picker UI can drive the same attribute later. The GEEDYX
  brand stays monochrome.
- **Geometry/motion tokens**: radius `none 0 / sm 2 / md 4 / lg 8 / full 9999`
  (predominantly straight), duration `100ms`/`150ms`, plus a global
  `prefers-reduced-motion` reduction rule.
- **Docs decision**: ADR-029 in `docs/DECISIONS.md` (+ pointer on ADR-027).

### Changed

- **Typography**: UI family switched from Geist Sans to **Inter** (variable,
  300–700) in `apps/web/src/app/layout.tsx` (mapped through `--font-sans`);
  Geist Mono remains `--font-mono` for data identifiers only (SKU, slug, prices).
- **`globals.css`**: canonical token set declared for light and dark and mapped
  in `@theme inline`; CP12 names (`primary*`, `surface-muted`, `surface-elevated`,
  `foreground`, `muted-foreground`) kept as **deprecated compatibility aliases**
  so existing components keep resolving unchanged. Radius override moves
  `rounded-md` from 6px → 4px app-wide (intentional).
- **Docs**: `docs/UI.md` updated to canonical names, Inter typography, accent
  configuration, and new Motion/Borders sections plus the icon+text rule for
  persistent states; `AGENTS.md` now mandates consulting `BRAND.md`, `UI.md` and
  `DESIGN-TOKENS.md` before any `apps/web` UI work and forbids inventing
  patterns when a system pattern exists.

### Verification

- Web + API lint clean; `pnpm build` clean; API unit tests clean.
- Themes and token loading unchanged (no component or layout regression introduced).

## CP12.4 — Local PostgreSQL normalization to GEEDYX (2026-09-11)

Completes the Nexory → GEEDYX infrastructure normalization started in CP12.3 by
switching the local development PostgreSQL defaults from `nexory` to `geedyx`.

### Changed

- **Docker**: `docker-compose.yml` now uses `POSTGRES_DB=geedyx` and
  `POSTGRES_USER=geedyx`. The password is no longer hardcoded: it is read from
  `POSTGRES_PASSWORD` (default `change-me`), so a real local secret stays out of
  the repository (repo-root `.env`/shell). Healthcheck updated to
  `pg_isready -U geedyx -d geedyx`.
- **Config**: `apps/api/.env` (gitignored) and `apps/api/.env.example` now use
  `geedyx` and `DATABASE_URL=postgresql://geedyx:<password>@localhost:5432/geedyx`.
  Example files only contain placeholders.
- **Database**: the old `nexory` development database was discarded (disposable
  dev data) and recreated as `geedyx`; the `nexory-postgres` container and
  `nexory_postgres-data` volume were removed and the existing Prisma migrations
  were re-applied to the fresh database.
- **Docs**: README and ADR-028 updated to describe the normalized defaults.

### Verification

- `docker compose up -d` → container `geedyx-postgres` healthy.
- `pnpm db:status`: Database connected (geedyx at localhost:5432), Users 0.
- Migration `add_user_category_product` applied on the fresh `geedyx` database
  (tables `User`, `Category`, `Product` created).
- API unit tests, web + API lint and `pnpm build` clean.

## CP12.3 — Product rename: Nexory → GEEDYX (2026-09-11)

The project previously used the provisional name **Nexory**. From this
checkpoint the official product and project name is **GEEDYX**.

### Changed

- **Identity**: root package renamed `nexory` → `geedyx`; workspace packages
  `@nexory/web` → `@geedyx/web` and `@nexory/api` → `@geedyx/api` (same
  structure; all `pnpm --filter @geedyx/*` scripts updated).
- **Session cookie**: renamed `nexory_session` → `geedyx_session`
  (`AUTH_COOKIE_NAME` in `apps/api/src/auth/strategies/jwt.strategy.ts` and
  `SESSION_COOKIE_NAME` in `apps/web/src/lib/api/server.ts`). Existing sessions
  are invalidated (acceptable in development; no compat mechanism added).
- **Branding**: all visible product/mark references (nest `metadata`, titles,
  wordmarks, layout, docs, README, AGENTS.md) now use GEEDYX.
- **Docker**: PostgreSQL container renamed `nexory-postgres` →
  `geedyx-postgres`. Ports, volumes and PostgreSQL credentials/config were kept
  (see the decision note below).
- **Docs**: README/AGENTS/docs update; ADR-028 records the rename. "Nexory"
  remains only as documented historical context (this changelog and
  `docs/DECISIONS.md`).

### Deliberately kept references

- `POSTGRES_DB`/`POSTGRES_USER`/`POSTGRES_PASSWORD` = `nexory` and the matching
  `DATABASE_URL` in `docker-compose.yml`, `apps/api/.env*` and README: concrete
  development infrastructure values predating the rename; changing them would
  force a database reset, which is out of scope for a naming checkpoint
  (ADR-028).
- Historical mentions of "Nexory" in this changelog / `docs/DECISIONS.md`.

### Verification

- `pnpm install` clean (lockfile regenerated under `geedyx` package names).
- Web + API lint: 0 errors. `pnpm build` clean (both apps).
- API unit tests (`pnpm test:api`): 9/9 green.
- Global search for `nexory` returns only the deliberately kept references
  above.

## CP12.2 — Bootstrap fixes, dev tooling and catalog removal (2026-09-11)

Completes the post-CP12 bootstrap experience and removes the public catalog,
which contradicts the current product decision (GEEDYX is a private admin app).

### Added

- **Dev database tooling** (`apps/api/scripts/db.ts`, compiled via
  `tsconfig.scripts.json`):
  - `pnpm db:status` — shows DB connectivity and User/Category/Product counts.
  - `pnpm db:users` — lists development users with id, username, email and
    timestamps; shows "ready for /setup" when empty.
  - `pnpm db:reset` — drops and re-migrates the local database (reuses
    `prisma migrate reset --force`); guarded against `NODE_ENV=production` and
    non-loopback `DATABASE_URL`.

### Changed

- `/` is now a session redirect: authenticated users go to `/admin`, others go
  to `/login` (restores the original CP7 behavior).
- `/login` no longer links to `/setup`; `/setup` is reached only by direct
  navigation (it remains the only bootstrap path; the login page does not
  expose it).

### Removed

- **Public catalog** (`/`, `/products/[slug]`, `components/catalog/`): the
  root page no longer renders a product catalog, and `/products/[slug]` no
  longer exists. The public catalog contradicts the current product decision
  (GEEDYX is a private admin application with no public views).
- `getPublicCategories`, `getPublicProducts`, `getPublicProductBySlug` and
  `publicFetch` from `apps/web/src/lib/api/server.ts` (only used by the now-
  deleted public pages).
- Catalog-only style exports from `components/ui/styles.ts`:
  `secondaryButtonClass`, `disabledPaginationClass`, `textLinkClass`.

### Decisions

- The public product API endpoints (`GET /products` etc.) remain in the NestJS
  API for internal use; only the web-facing catalog pages are removed. This
  avoids touching ADR-025/026 and the API contract.

### Verification

- Web lint: 0 errors (2 accepted `<img>` warnings). API lint clean.
- `pnpm build`: clean (both apps); `/` no longer appears as a static page.
- API unit tests: 9/9 green.
- `pnpm db:status`: Database connected (nexory at localhost:5432), Users: N,
  Categories: 0, Products: 0.
- `pnpm db:users`: lists users with id, email, created/updated timestamps.
- `pnpm db:reset`: production guard (NODE_ENV=production → abort), non-loopback
  guard (host ≠ localhost → abort), full reset on local DB verified (with user
  consent); post-reset db:status shows 0 users, /setup works again.
- `GET /` (unauthenticated) → 307 to `/login`.
- `GET /` (with valid session) → 307 to `/admin`.
- `GET /products/[slug]` → 404.

## CP12.1 — Initial admin setup UI (2026-09-11)

Completes the only gap found after CP12: the frontend had no experience to run
the initial administrator setup (`POST /auth/setup` existed only in the API).

### Added

- **`/setup` page** (`apps/web/src/app/setup/page.tsx`): mirrors the `/login`
  layout (centered card, wordmark, `ThemeToggle`). With an active session it
  redirects to `/admin`; otherwise it shows the first-administrator form.
- **`SetupForm`** (`apps/web/src/components/setup-form.tsx`): username / email /
  password fields with visible labels, minimal client validation consistent
  with the API DTOs (backend stays the authority), loading state on submit,
  and success navigation to `/admin` after the backend sets the HttpOnly
  cookie. A `403` from `POST /auth/setup` is treated as an expected state: it
  renders an "already configured" message with a button to go to `/login`
  (no generic "Request failed").
- **`setup()` client method** (`apps/web/src/lib/api/client.ts`): typed
  `POST /auth/setup` through the existing `clientFetch` (`credentials:
  "include"`, `ApiError`, no `any`).
- **Discreet login entry point**: `/login` shows a muted, secondary link
  "¿Primera vez? Configura el administrador" → `/setup` (not a dominant action).

### Decisions

- No new backend endpoint (`/auth/status` deliberately not added). "Setup
  already completed" is detected client-side from the existing `403` response;
  the backend remains the single authority on setup state (ADR-020).
- No auth refactor: the new UI only reuses `/auth/setup`, the existing cookie
  flow and the Design System (`docs/UI.md`). No JWT/cookie/CORS/Prisma changes.

### Verification

- Web + API lint: 0 errors (only the 3 accepted `<img>` warnings).
- `pnpm build` clean (both apps); `/setup` route registered.
- `pnpm test:api` (unit): 9/9 green. API e2e intentionally not run in this
  checkpoint because the suite wipes the shared dev DB users.
- Isolated end-to-end on a scratch PostgreSQL: `GET /auth/me` → 401,
  `POST /auth/setup` → 201 + HttpOnly cookie, `GET /auth/me` with cookie →
  200, second `POST /auth/setup` → 403, logout → 204, login → 200 + cookie,
  wrong credential → 401. Web routing (against the probe API): `/setup` shows
  the form without a session and redirects to `/admin` with one; `/admin`
  still protects into `/login`; `/login` shows the discreet setup link. Dev DB
  untouched (user count stayed 1).

## CP12 — Design System & UI refinement (2026-09-11)

Established the official GEEDYX Design System and applied it to the entire
current MVP, without touching business functionality, data, or API contracts.
No business logic changed.

### Design System

- **Semantic tokens** (`apps/web/src/app/globals.css`): single source of truth
  for colors — surfaces, text, borders, brand blue (`primary` family), status
  accents (`success`/`warning`/`danger`), `overlay`, `input`, `selection`,
  `shadow-panel` — with real **Light and Dark** variants mapped into Tailwind 4
  utilities via `@theme inline`.
- **Themes**: Light / Dark / System via `next-themes` (`defaultTheme=system`,
  `enableSystem`); the dark theme is a full surface hierarchy, not "black +
  white". The dormant dark surface tokens (previously defined but unused by
  several pages) are now applied everywhere.
- **Dependency decisions (ADR-027)**: `lucide-react` (icons) and
  `next-themes` (theming) are the only UI-related dependencies; no UI kits or
  component/state/form/animation libraries. Decision documented in
  `docs/UI.md` and `docs/DECISIONS.md`.

### Shared UI components

- `components/ui/` is now the single set of shared primitives — Button,
  IconButton, Input/Select/Textarea/FieldLabel/FieldError, **Dialog**, Badge,
  EmptyState, ErrorState, PageHeader, SearchInput, Skeleton, ThemeProvider,
  ThemeToggle, plus the class-string tokens in `styles.ts`.
- **Error boundaries reuse `ErrorState`** (they previously hand-rolled their
  own retry UI with raw palette colors).
- **Loading skeletons use semantic colors / `Skeleton`** instead of hard-coded
  `slate-*`.
- **Dialogs/overlays verified**: the single `Dialog` primitive fixes the
  historical overlay bug (backdrop painted above the panel). Panel layers
  above the backdrop (`relative z-10` inside `z-40`), body scroll lock,
  internal scroll with fixed header/footer, Escape/backdrop/✕ close, focus
  trap + initial focus + focus restore. Z-order is coherent
  (sidebar `z-20` < drawer `z-30` < dialog `z-40`).

### Applied to every MVP surface

- **Admin**: dashboard (`PageHeader`, tokens), share shell already token-based;
  products and categories CRUD already token-based and reused throughout.
- **Public**: catalog landing, product detail (`/products/[slug]`), both error
  boundaries and all five route `loading.tsx` skeletons were converted from
  raw `slate-*`/`blue-*` colors to semantic tokens, so they now follow Light /
  Dark correctly.
- Removed the unused CP7 `section-placeholder.tsx`.

### Fixes

- **Broken web build (pre-existing)**: added `secondaryButtonClass` to
  `styles.ts` (imported but never exported) and corrected the `EmptyState`
  import path in `/` and `/admin`.
- **Web lint error (pre-existing)**: `ThemeToggle` no longer calls `setState`
  synchronously inside an effect; it uses `useSyncExternalStore` for the
  mounted guard, resolving the `react-hooks/set-state-in-effect` rule.

### Documentation

- `docs/UI.md` rewritten as the **official Design System contract** (tokens,
  themes, typography, spacing, radius, shadows, icons, buttons, forms,
  dialogs, tables, badges, navigation, page headers, toolbars, loading, empty
  states, error states, responsive, accessibility, component inventory,
  dependency policy).
- `AGENTS.md` now requires every new UI to use the Design System and to never
  hard-code palette colors.
- `docs/DECISIONS.md` records ADR-027 (Design System).
- `docs/ARCHITECTURE.md` status lines reconciled with the CP12 work.

### Verification

- Web lint: 0 errors (only the 3 accepted `<img>` warnings). API lint clean.
- `pnpm build`: clean (both apps).
- API unit tests: 9/9 green.
- No API contracts, schema, or business behavior changed.

## CP11 — MVP hardening and release (2026-09-10)

Final MVP checkpoint: a full audit and hardening pass. No new business
functionality was added.

### Audit

- **Architecture**: verified Next.js never touches PostgreSQL, NestJS owns
  business logic/Prisma, authentication stays in the backend, no accidental
  direct access from `apps/web`, no needlessly duplicated endpoints (no
  refactors done).
- **Authentication**: verified HttpOnly cookie, `SameSite=Lax`, `Secure` via
  `COOKIE_SECURE`, `Path=/`, cookie lifetime matches the JWT
  (`JWT_EXPIRES_IN`), `JWT_SECRET` required, no localStorage/sessionStorage and
  no JWT in JSON, `/auth/me` + `/auth/logout`, admin and mutation protection,
  login/setup rate limiting, explicit CORS. No refresh tokens (ADR-019).
- **Security**: confirmed upload validation (MIME whitelist, magic bytes,
  size limit, server-generated UUID filenames, SVG rejected, path traversal
  prevented, replacement and product deletion remove files), public-only-active
  catalog rules (ADR-025/026), and error handling that never leaks
  stacks/Prisma codes/SQL/secrets.
- **UI/UX**: reviewed every admin and public surface for consistency,
  responsiveness and basic accessibility; the no-decorative-design rules were
  kept.

### Fixed

- **`JWT_SECRET` empty-string fail-fast** (`apps/api/src/auth/auth.module.ts`):
  an empty `JWT_SECRET=` in the environment is a *present* value for the config
  service, so the previous `getOrThrow` allowed booting and silently signing
  tokens with an empty secret. The API now refuses to start with a clear
  message (verified by booting with an empty secret).
- **`TRUST_PROXY` support** (`apps/api/src/main.ts`): behind a reverse proxy the
  throttler now keys on the real client IP when `TRUST_PROXY=true` (default
  `false`). Documented in `.env.example` and `docs/`.
- **Node engine requirement**: root `engines` and README said Node 18+, but
  Next.js 16 requires Node ≥ 20.9. Corrected to `>=20.9.0` and documented.
- **Accessibility**: the product price input in the admin form gained a proper
  accessible name (`aria-label="Precio"`); the remaining inputs already had
  labels and icon buttons already had `aria-label`s.
- **Repository hygiene**: removed a stray `apps/api/pnpm-lock.yaml` (a nested
  lockfile that does not belong in a pnpm workspace) and the unused
  create-next-app SVG assets under `apps/web/public`.
- **Documentation** (see below): the README became the full reproducible setup
  guide; roadmap/API/security/architecture/UI docs were reconciled; two
  diverging changelogs were consolidated into this single file.

### Kept decisions (documented, not changed)

- Product images render with a native `<img>` instead of `next/image` because
  the images come from the environment-configurable API origin; the three
  `@next/next/no-img-element` lint warnings are accepted (see ARCHITECTURE.md,
  UI.md).
- Local filesystem storage remains the MVP storage; the ephemeral-filesystem
  warning and the future Supabase/S3 migration are documented.
- No Docker images for the two apps yet; they run as standard Node services.

### Verification

- `@geedyx/web` lint: 0 errors (3 accepted `<img>` warnings); build clean.
- `@geedyx/api` lint, build clean; unit tests 9/9; e2e 83/83.
- Smoke test on real PostgreSQL with production builds: **26/26 checks** —
  migration deploy, admin bootstrap (201) and lock (403), login, category and
  product creation, image upload, edit, public catalog without a session,
  search, category filter, product detail (metadata, es-MX USD price, image via
  API, SKU), deactivate → product disappears from the catalog and the public
  detail renders a 404 without leaking data, reactivate → product returns,
  delete product/category, no orphaned uploads, DB clean except the single
  administrator.

## CP10 — Public catalog (2026-09-10)

### Added

- Public storefront in `apps/web`, fully unauthenticated and reading only
  active products:
  - `/` catalog landing: SEO title/description ("Catálogo · GEEDYX"), compact
    public header (GEEDYX wordmark + "Catálogo", discreet "Administración"
    link), responsive grid of product cards, honest empty / no-results states,
    and route-specific `loading.tsx` + shared `error.tsx`.
  - Search (`search`), category filter (`categoryId`), sorting
    (`sort`/`order`: name/price/stock/createdAt), pagination and page size
    (`page`/`limit` 10/20/50) — all URL-driven through
    `parseProductQuery`/`productQueryToSearchParams` so refresh and
    back/forward keep state; debounced 400 ms search, a "Limpiar filtros"
    action, and server-side correction of out-of-range `page`.
  - `/products/[slug]` detail: `generateMetadata` (title "Name · GEEDYX",
    description when present), image, es-MX price, SKU, category link,
    availability indicator with stock count, description section only when
    present; unknown or inactive slugs render a Next.js 404 via `notFound()`.
  - New `components/catalog/`: `catalog-header`, `catalog-filters` (client),
    `availability`, `catalog-image` (client, image fallback), `product-card`,
    `product-grid`, `pagination`.
- `lib/api/server.ts`: public read helpers `getPublicCategories`,
  `getPublicProducts`, `getPublicProductBySlug` that never forward the
  session cookie (then `nexory_session`, renamed `geedyx_session` in CP12.3);
  the authenticated `GET /products` is auth-aware, so
  omitting the cookie keeps every storefront read strictly "only active"),
  each wrapped in React `cache()`.

### Decisions

- The public storefront deliberately omits the session cookie (ADR-026).
- Sorting uses only the whitelisted fields from `parseProductQuery`.
- No new web dependencies.

### Verification

- `@geedyx/web` lint and build clean; `@geedyx/api` build and unit tests 9/9.
- Manual end-to-end run (Postgres via Docker) 41/41 checks passed covering the
  public catalog flows, admin regressions and a clean database afterwards.

## CP9 — Products management UI (2026-09-10)

### Added

- `/admin/products` real CRUD in `apps/web` replacing the CP7 placeholder,
  over the existing NestJS API plus a small approved backend extension
  (`GET /products` list items now include `lowStockThreshold` and `imageUrl`;
  `GET /products/:id` is auth-aware so the admin can edit inactive products).
- URL-driven list state: debounced name/SKU search, category and status
  filters, sort field + direction, page size 10/20/50 and pagination, all
  reflected in the URL (survives refresh and back/forward) using
  `parseProductQuery`/`productQueryToSearchParams` and the "adjust state during
  render" resync pattern.
- Dense responsive table (stacked rows on mobile), create/edit dialog with
  grouped fields and manual validation (name/SKU/description/price/stock/
  umbral/category/activo), low-stock and out-of-stock indicators, direct
  activate/deactivate toggle, delete confirmation ("El producto … se eliminará
  junto con su imagen.") with page clamping, and image upload/replace/delete
  with client pre-validation and degraded banners.
- `es-MX` USD price formatting, status-mapped Spanish errors (including `409`
  SKU and `413` size), honest empty/no-results states, route `loading.tsx`.
- No new dependencies; shared `Modal` and class-string helpers promoted to
  `components/ui/`.

### Verification

- `@geedyx/web` lint/build clean; `@geedyx/api` lint/build + unit tests clean;
  e2e 82 green; manual verification of the full admin flows.

## CP8 — Web categories management (2026-09-10)

### Added

- `/admin/categories` real CRUD in `apps/web` (replaces the CP7 placeholder)
  over the existing NestJS API; no backend changes.
- Layout: Server Component page (`requireSession` + `getCategories`) and client
  components under `components/categories/` (`CategoriesView` orchestrator,
  form dialog for create/edit, delete confirm dialog, small shared `Modal`,
  shared Tailwind class strings in `ui.ts`).
- List: dense table with Categoría/Slug/Acciones on desktop and stacked rows on
  mobile; live client-side case-insensitive search; honest empty and
  no-results states; per-route `loading.tsx` skeleton.
- Mutations: create/update/delete from the browser with
  `credentials: "include"`; the list refreshes from `GET /categories` without a
  full page reload; transient success banner.
- Validation and errors: manual name validation (required, trim, ≤ 80 chars);
  user-facing Spanish messages mapped by status (`409` → duplicate-name or
  products-associated messages); raw/internal messages never shown.
- `lib/api` additions: `listCategories`/`createCategory`/`updateCategory`/
  `deleteCategory` (client), `getCategories` (server), and `apiErrorMessage`
  (status mapping). `EmptyState` gained an optional `action` slot.

### Decisions

- No new web dependencies (e.g. no `zod`); category-specific components only —
  no generic CRUD/table/modal framework yet.

### Verification

- `@geedyx/web` lint and build clean; `@geedyx/api` lint, build and unit tests
  (9/9) clean; manual run 17/17 checks (redirect rules, login, CRUD, 409s,
  cleanup).

## CP7 — Web authentication and admin shell (2026-09-10)

### Added

- Next.js web application session handling: login page (`/login`) and logout
  posting directly to the API (`credentials: "include"`), HttpOnly cookie
  managed by the backend; `lib/api` typed data-access layer (base URL, error
  parsing via `ApiError`, `getSession`/`requireSession`, server-side stats).
- Protected administration shell: `/admin` layout with `requireSession()`
  (redirects to `/login`), fixed sidebar on desktop and compact drawer on
  mobile, header with current section, signed-in user and logout.
- `/` redirects to `/admin` or `/login` based on the session; `/admin`
  dashboard with real product/category counts (restrained summary cards,
  honest empty states); placeholder Products/Categories pages; `loading.tsx`
  skeleton and `error.tsx` error boundary; light theme (`color-scheme: light`)
  and existing design rules applied.

### Verification

- `@geedyx/web` lint/build clean; manual verification 18/18 (redirect rules,
  login + cookie, dashboard counts, empty states, logout).

## CP6 — Product images (2026-09-10)

### Added

- `POST /products/:id/image`: upload (multipart, `file` field) or replace a
  product image; returns the updated product with `imageUrl`.
- `DELETE /products/:id/image`: remove the product image; `204` even when the
  product never had one.
- Images module (`apps/api/src/images`): `ImageStorage` interface +
  `IMAGE_STORAGE` token, `LocalImageStorage` (local filesystem MVP), format
  whitelist with magic-byte content sniffing (JPEG/PNG/WebP), and Multer
  upload options (`fileSize` limit + MIME filter).
- Static serving of `/uploads/*` with `max-age=1y, immutable` cache headers
  (`apps/api/src/static-assets.ts`).
- Deleting a product now also deletes its image file; replacing an image
  deletes the previous file.

### Configuration

- New env vars: `UPLOAD_DIR` (default `uploads/`) and `MAX_IMAGE_SIZE_MB`
  (default `5`). `.env.example` updated.
- `uploads/` added to the root `.gitignore`.

### Security

- Uploads require an authenticated session.
- Only JPEG/PNG/WebP allowed; SVG rejected. MIME type and content are both
  validated (magic bytes), and a size limit applies (`413` on overflow).
- Stored filenames are server-generated UUIDs; client filenames never touch
  the filesystem, preventing path traversal.

### Tests

- New e2e suite `product-images.e2e-spec.ts` (19 tests) and a new unit suite
  `local-image-storage.spec.ts` (8 tests). Full API e2e reached 82 green;
  unit 9 green; build and lint clean.

## CP5 — Products API (2026-09-10)

### Added

- `ProductsModule` CRUD: list with pagination/search/filters, detail by id and
  slug, create, update, delete (see `docs/API.md`).
- Public reads never expose inactive products (ADR-025); `OptionalJwtAuthGuard`.
- Slug conflicts resolved with a deterministic numeric suffix (ADR-024);
  prices serialized as JSON numbers (ADR-023).
- E2E suite `products.e2e-spec.ts`; the API e2e suite reached 63 green tests.

## CP1–CP4 — Project foundation and core API

- Bootstrap: pnpm workspace monorepo with `apps/web` (Next.js) and
  `apps/api` (NestJS), Docker PostgreSQL 17, ESLint/Prettier and
  TypeScript strict everywhere (no `any`).
- Documentation set: PRODUCT, ARCHITECTURE, DATABASE, API, SECURITY, UI,
  ROADMAP and DECISIONS (ADRs), plus AGENTS.md.
- Database + domain (`User`, `Category` and `Product`) via Prisma with
  constraints, indexes and the `add_user_category_product` migration.
- Authentication: `/auth/setup` (single admin, locked afterwards),
  `/auth/login`, `/auth/me`, `/auth/logout` with Argon2id, short-lived JWT in
  an HttpOnly cookie, Passport JWT strategy/guard, DTO validation, explicit
  CORS with credentials and in-memory rate limiting.
- Categories API: list/get-by-id/get-by-slug/create/update/delete with
  server-side slug generation, admin-only mutations and `409` handling.
- Products API: paginated list with search/filters, detail by id and slug,
  create/update/delete with unique SKUs and slug suffixes.

## Notes

- Versioning (semver releases) will start after the MVP; checkpoints are the
  delivery milestones for now.