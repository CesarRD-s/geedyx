# GEEDYX — Roadmap

Nothing marked as **planned** is implemented yet.

## MVP — completed (CP1–CP11)

All MVP capabilities are implemented and verified by automated tests and a full
smoke run on a real PostgreSQL:

- project foundation (monorepo, Next.js + NestJS, Docker PostgreSQL, docs);
- authentication (single administrator, Argon2id, short-lived JWT in an
  HttpOnly cookie, bootstrap endpoint locked after setup);
- categories (API CRUD, public reads, admin UI at `/admin/categories`);
- products (API CRUD, search/filters/sorting/pagination, stock, activation,
  admin UI at `/admin/products`);
- product images (upload/replace/delete with validation, local filesystem
  storage);
- public catalog (`/`, `/products/[slug]` — only active products);
- v1 dashboard (real counts only; no invented statistics).

Checkpoint 11 — “MVP hardening and release” — audited architecture, auth,
CORS, environment, uploads, public/admin separation, UI/UX, accessibility and
error handling; fixed real issues (JWT_SECRET fail-fast, TRUST_PROXY, Node
engine requirement, a stray lockfile, an unlabeled price input, stale docs);
and verified everything with lint, builds, unit tests, API e2e and the smoke
test. See [CHANGELOG.md](../CHANGELOG.md).

The advanced inventory dashboard and its statistics were intentionally left out
of the MVP scope (no invented metrics). They belong to V1/V2.

## V1 — Inventory (planned)

- Inventory movements.
- Stock history.
- Stock adjustments.
- Low-stock rules.

## V2 — Operations (planned)

- Suppliers.
- Purchases.
- Orders.
- Reports.

## V3 — Administration (planned)

- Users (multi-account).
- Roles.
- Permissions.
- Audit logs.

## V4 — Platform (planned)

- Warehouses.
- Advanced reports.
- Notifications.
- Multi-tenancy evaluation.

## Notes

- Scope changes require explicit approval (see [AGENTS.md](../AGENTS.md)).
- Nothing in this roadmap is implemented until it is.
- V1 and beyond will not be started automatically.
- Local image storage is an MVP decision; cloud storage (Supabase/S3) is a
  future migration (ADR-006/007).