# GEEDYX — Architectural decisions

This document records the initial architectural decisions (ADRs) for GEEDYX.
Each decision is concise and describes what was decided and why.

## ADR-001 — PostgreSQL is the primary database

PostgreSQL will be the primary database for all business data.

## ADR-002 — NestJS owns backend business logic and database access

The NestJS API is the only application that reads and writes the database and
contains business logic.

## ADR-003 — Next.js and NestJS are separate applications

The frontend and backend are separate applications with their own lifecycle,
tooling, and deployment. No shared runtime.

## ADR-004 — REST is used for frontend/backend communication

The Next.js application talks to the NestJS API over REST. No microservices,
no GraphQL, no RPC.

## ADR-005 — Docker is used for local PostgreSQL development

Docker Compose provides a local PostgreSQL instance for development. No other
infrastructure is containerized at this stage.

## ADR-006 — Local filesystem storage is used for product images in the MVP

Product images are stored on the local filesystem in the MVP. The database
stores the image URL/path, not the binary.

## ADR-007 — Storage is abstracted for future migration

Storage is behind the `ImageStorage` interface (provided by `ImagesModule` as
the `IMAGE_STORAGE` token) so it can later use Supabase Storage or S3 without
changing product logic. The interface operates on public URLs; the MVP
`LocalImageStorage` maps them to files.

## ADR-008 — The MVP has one administrator and no role/permission system

The MVP covers a single administrator with no registration, roles, permissions,
or multi-user support. Those arrive in later milestones.

## ADR-009 — Authentication will use secure HttpOnly cookies

Sessions are held in HttpOnly cookies. Tokens are never stored in localStorage.
Passwords use Argon2.

## ADR-010 — The project intentionally avoids premature complexity

No Turborepo, no shared packages, no microservices, no premature abstractions.
Complexity is introduced only when there is a concrete requirement.

## ADR-011 — Prisma is used with PostgreSQL

Prisma is the data access layer for the NestJS API. The database connection is
configured through the `DATABASE_URL` environment variable and all schema
changes are managed with Prisma Migrations. Prisma is owned by the API and is
never accessed from the frontend.

## ADR-012 — Monetary values use PostgreSQL Decimal

Prices are stored as PostgreSQL `NUMERIC(10, 2)` (Prisma
`Decimal @db.Decimal(10, 2)`). Floating-point types are never used for money
to avoid rounding errors.

## ADR-013 — Product belongs to one Category

A product belongs to exactly one category in the MVP (`Category 1 — N Product`).
Deleting a category that still has products is rejected (`ON DELETE RESTRICT`)
so products are never left orphaned.

## ADR-014 — SKU is unique per product

`Product.sku` is globally unique. Duplicate SKUs are rejected at the database
level regardless of application validation.

## ADR-015 — No inventory movement history in the MVP

Stock is a value on the product; no inventory movement/stock history tables
exist yet. Inventory movements will be modeled in a later milestone.

## ADR-016 — User model exists before authentication

The `User` model is part of the data foundation and exists before
authentication is implemented. It only stores identity data required by the
planned login (username, email, password hash); no roles, permissions,
verification or refresh-token fields are added until they are required.

## ADR-017 — Prisma-generated CUID identifiers

Primary keys use Prisma-generated CUIDs (`@default(cuid())`). CUIDs are
sortable, URL-compatible, and generated client-side without a database round
trip, which fits Prisma usage and the MVP's scale.

## ADR-018 — JWT held in an HttpOnly cookie (stateless session)

Authentication uses a signed JWT stored in an HttpOnly, SameSite cookie
(`geedyx_session`). The payload is minimal (`sub` = user id, `email`). There is
no server-side session store and no refresh token in the MVP. The cookie keeps
the JWT out of JavaScript, and the stateless token avoids database lookups on
every authenticated request.

## ADR-019 — No refresh tokens in the MVP

The MVP uses a single short-lived JWT instead of an access/refresh token pair.
The session lifetime is controlled by `JWT_EXPIRES_IN` (default `1h`).
Refresh tokens add server-side revocation and rotation complexity that the MVP
does not need; they can be introduced later if sessions must outlive the JWT.

## ADR-020 — Setup creates exactly one administrator

`POST /auth/setup` is the only way to create users and only succeeds while the
`User` table is empty. The check runs in the service immediately before
creating the user. This guarantees a single primary administrator and prevents
public registration.

## ADR-021 — In-memory rate limiting (no Redis)

Rate limiting uses `@nestjs/throttler` with default in-memory storage,
configured per route (`/auth/login` and `/auth/setup` are limited to 5
requests/minute, everything else to 100/minute). No Redis or additional
infrastructure is introduced in the MVP. In-memory limits are per API process;
if GEEDYX is scaled to multiple instances, this should move to a shared store.

## ADR-022 — Category slug is derived from name and unique at the database

The `Category.slug` is generated server-side from the normalized name (a pure
utility in `apps/api/src/categories/slug.ts`, no library) and is never accepted
from the client. The database enforces a unique `slug` constraint. The service
checks for a conflict before writing and also translates the unique-constraint
violation (`Prisma P2002`) into a `409 Conflict`, so duplicates are rejected
correctly even under concurrent requests. The slug is also used as a public
read path (`GET /categories/slug/:slug`).

## ADR-023 — Product prices are serialized as JSON numbers

Prices are stored as PostgreSQL `NUMERIC(10, 2)` (ADR-012). Prisma 7 exposes
these as `runtime.Decimal` (decimal.js) on reads, and a plain JS `number` is
ambiguous for writes (binary floating point cannot represent every decimal
exactly). The API contract therefore fixes the serialization at the HTTP layer:
reads convert with `row.price.toNumber()` (always return a number with ≤ 2
decimals), and writes pass an exact `price.toFixed(2)` string to Prisma. The
balance, 409/404 mapping, decimal coercion and null/`NaN` rejection all happen
in the service, so DTOs/controllers never touch decimal details.

## ADR-024 — Product slug conflicts use a deterministic numeric suffix

Products derive their slug from `name` the same way as categories. When the
slug is already taken, the API appends a deterministic numeric suffix
(`-2`, `-3`, …) instead of rejecting or generating a random suffix. Resolution
combines a `findAvailableSlug` pre-check (which skips the product being
updated) with a bounded retry loop on the `P2002` unique-constraint violation:
`Prisma.PrismaClientKnownRequestError.meta.target` distinguishes a `sku`
conflict (reject with `409`) from a `slug` conflict (retry the next suffix).
This keeps names human-readable, slug creation race-safe, and duplicate-SKU
failures immediate.

## ADR-025 — Public product reads never expose inactive products

The public catalog (`GET /products`, `GET /products/:id`,
`GET /products/slug/:slug`) uses an `OptionalJwtAuthGuard` that accepts
requests with or without a session cookie. Anonymous requests always see only
`isActive = true` products and the `isActive` filter is ignored; unbranded
detail reads never leak inactive stock. This keeps the storefront from leaking
inactive stock while keeping the catalog readable without authentication.

In checkpoint 09 the admin UI needed to open inactive products for editing, so
`GET /products/:id` was extended to be auth-aware: a request carrying a valid
admin session may read the detail of inactive products, while anonymous
behavior is unchanged (still `404`). `GET /products/slug/:slug` remains
public-only and still returns `404` for inactive products, and the public list
still never includes them (except when an authenticated admin filters by
`isActive`).

## ADR-026 — The public storefront never forwards the admin session cookie

The API's `GET /products` is auth-aware: a request carrying a valid admin
session is not forced to `isActive = true` when the query omits the filter, so
an authenticated browser would otherwise see inactive products on public
catalog pages. The public storefront therefore reads through cookie-free
`lib/api/server.ts` helpers (`getPublicCategories`, `getPublicProducts`,
`getPublicProductBySlug`) that never forward `geedyx_session`. Every storefront
read is deterministic and always limited to active products, regardless of the
browser's session state, making ADR-025's public rule enforceable at both ends.

The catalog reuses the URL-driven query state established for the admin
products list: `parseProductQuery`/`productQueryToSearchParams`
(`lib/products/query.ts`) whitelist `sort`/`order` (name/price/stock/createdAt)
and normalize `limit`/`page`, so the client controls only expose valid values.
`generateMetadata` and the page render share one data fetch through React
`cache()`. No new dependencies were added.

Note on streaming: inside streamed server responses Next.js 16 delivers
`notFound()` and `redirect()` as HTTP 200 (404 UI) and as 200 with a
`<meta http-equiv="refresh" ...>` respectively. CP10 assertions account for
this; it matches the `/admin` redirect behavior already shipped since CP7.

## ADR-027 — GEEDYX Design System: semantic tokens + shared UI primitives

The visual language is a single, documented source of truth owned by the web
app. Colors are **semantic CSS custom properties** declared in
`apps/web/src/app/globals.css` for light (`:root`) and dark (`.dark`) and mapped
into Tailwind 4 utilities through `@theme inline` (e.g. `bg-surface`,
`text-muted-foreground`, `border-border-strong`, `bg-primary`,
`shadow-panel`). Components never hard-code palette colors (slate/blue/white/
hex); a color that needs a variant is added as a token instead.

Decision elements (CP12):

- **Tokens**: `background`, `surface`, `surface-muted`, `surface-elevated`,
  `foreground`, `muted-foreground`, `border`, `border-strong`, the `primary`
  brand family, `success`/`warning`/`danger` (+ `-strong`), `overlay`,
  `input`, `selection`, `shadow-panel`. The `info` status maps to the brand
  `primary` (one blue for brand and informational states).
- **Themes**: Light, Dark and System via `next-themes` (class strategy,
  `defaultTheme = system`, `enableSystem`). The dark theme is a full surface
  hierarchy, not "black + white". No scattered `dark:` exceptions.
- **Dependencies**: `lucide-react` (icons, used only where they add
  information) and `next-themes` (theming) were introduced as part of the
  Design System. No UI kits, component libraries, animation/state/form
  libraries.
- **Shared primitives** in `apps/web/src/components/ui/`: Button, IconButton,
  Input/Select/Textarea/FieldLabel/FieldError, Dialog, Badge, EmptyState,
  ErrorState, PageHeader, SearchInput, Skeleton, ThemeProvider, ThemeToggle,
  and the class-string tokens in `styles.ts`.
- **Dialog/overlay contract**: one `Dialog` primitive fixes the historical
  overlay bug — fixed wrapper `z-40`, backdrop painted below the `relative
  z-10` panel, body scroll lock, internal scroll with fixed header/footer,
  Escape/backdrop/✕ close, focus trap + initial focus + focus restore.
- **Documentation**: `docs/UI.md` is the official Design System contract and
  `AGENTS.md` requires every new UI to use it.

> Names from this ADR (e.g. `primary`, `surface-muted`, `muted-foreground`)
> became **deprecated compatibility aliases** in CP12.5 (ADR-029) and were
> **removed in CP12.6**; only the canonical names exist now.

Rationale: a single token/component foundation lets future milestones (V1
inventory and beyond) build with the same visual language instead of
reinventing it, without rewriting the application.

## ADR-029 — GEEDYX Design System v1.0 (CP12.5)

AM
The Design System v1.0 formalizes the visual language as a documented contract
without redesigning the existing screens. It adds brand and token documents,
a canonical token nomenclature, and prepares `apps/web` infrastructure for the
CP12.6 UI migration.

Accepted:

- **Documentation**: `docs/BRAND.md` (monochrome identity, accent-independent
  wordmark) and `docs/DESIGN-TOKENS.md` (living token reference, light/dark
  values, usage rules) are created; `docs/UI.md` is updated to reference them
  and to use canonical names; `AGENTS.md` requires consulting these documents
  before any `apps/web` UI work.
- **Canonical tokens**: neutral (`background`, `surface`, `surface-subtle`,
  `surface-raised`), text (`text`, `text-secondary`, `text-muted`), borders
  (`border`, `border-strong`), accent (`accent`, `accent-hover`,
  `accent-active`, `accent-foreground`, `accent-muted`), semantic
  (`success`/`warning`/`danger`/`info` + `-strong`), and misc (`overlay`,
  `input`, `selection`, `shadow-panel`). The primary text utility keeps the
  name `text-foreground` (its backing token is `text`).
- **Accent decoupled from brand**: the accent drives interaction
  (actions, selection, links, focus) and is **configurable** — it swaps via
  `data-accent="indigo"` on `<html>` (an example alternate palette ships in
  `globals.css`; a picker UI can drive the same attribute later). The GEEDYX
  identity stays monochrome and never uses the accent. `info` becomes an
  independent token so it can diverge from the accent later.
- **Compatibility aliases**: CP12 names (`foreground`, `muted-foreground`,
  `surface-muted`, `surface-elevated`, `primary*`) were retained as deprecated
  aliases in `globals.css` and in `@theme inline` so existing components keep
  resolving unchanged. **Removed in CP12.6** once every component had been
  migrated to canonical names; mixed uses (e.g. `primary`/`accent` pairs) are
  now canonical-only.
- **Typography**: the UI family is **Inter** (variable, 300–700) loaded via
  `next/font/google` (replacing Geist Sans) and mapped through `--font-sans`;
  Geist Mono remains `--font-mono` for data identifiers only (SKU, slug, IDs,
  prices). The wordmark is independent of the UI typography.
- **Geometry / motion**: radius tokens `none 0 / sm 2 / md 4 / lg 8 / full
  9999` (predominantly straight; `rounded-md` moves from 6px to 4px
  app-wide); motion tokens `--duration-fast` 100ms / `--duration-normal` 150ms
  with a global `prefers-reduced-motion` reduction rule; shadows remain for
  floating elements only; borders are a first-class structuring tool
  (`border-border` subtle / `border-border-strong` strong); persistent states
  render as icon + text, never as buttons.

Alternatives considered: full visual redesign (rejected — outside scope; the
CP12.6 checkpoint applies the system to the existing screens), and renaming the
primary-text token to `--color-text` (rejected — it would generate the
ambiguous class `text-text`; the canonical text token is `text` while the
utility keeps the name `text-foreground`).

Rationale: CP12 already established semantic tokens and shared primitives; v1.0
adds the missing documentation, canonical nomenclature, accent configurability
and the Inter typography, and prepares the app for the CP12.6 migration without
destabilizing the existing UI.

> **Status (CP12.6):** the migration is complete. Every screen (`/setup`,
> `/login`, `/admin*`) and shared `ui/` component now uses canonical tokens; the
> deprecated aliases were removed from `globals.css`. Concrete pattern decisions
> ratified here: tables use a `bg-surface-subtle` header band (UI.md §12), the
> sidebar active nav adds a 2px left-edge accent indicator bar (UI.md §14),
> list filter toolbars are tonal `bg-surface-subtle` bands without container
> borders (UI.md §16), dialogs keep `rounded-lg`, and the header logout is a
> ghost icon + text button.

## ADR-028 — Project renamed from "Nexory" (provisional) to "GEEDYX"

The project was developed under a provisional name ("Nexory") during the MVP
checkpoints. Starting at CP12.3, the official product and project name is
**GEEDYX**. Identity references (branding, package names, the session cookie,
documentation, Docker container names) use GEEDYX; "Nexory" is kept only as
historical context in `CHANGELOG.md` and this document. Local development
PostgreSQL defaults were deliberately kept as `nexory` during the rename
(CP12.3) to avoid blocking the checkpoint with a database reset. They were
normalized in CP12.4: `POSTGRES_DB`/`POSTGRES_USER` = `geedyx`,
`DATABASE_URL` points to `/geedyx`, and the password is a local secret —
`docker-compose.yml` reads `${POSTGRES_PASSWORD}` (default `change-me`) and the
real value lives only in the gitignored `apps/api/.env`.

## Related

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [SECURITY.md](./SECURITY.md)
- [AGENTS.md](../AGENTS.md)