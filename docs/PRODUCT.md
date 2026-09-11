# GEEDYX — Product

## What is GEEDYX

GEEDYX is a small but extensible product and inventory management platform.

It is designed to grow from a focused MVP into a broader product/inventory
administration platform without being rebuilt along the way.

## MVP

### Administrator capabilities

The initial MVP allows an administrator to:

- Authenticate.
- Manage products.
- Manage categories.
- Manage stock.
- Upload product images.
- View inventory statistics.

## Primary user

The primary (and only) MVP user is the administrator. GEEDYX is a private
administrative application; there are no public-facing views as of CP12.2.

## Scope decisions

- The MVP has a single administrator and no registration flow.
- There are no roles, permissions, or multi-user features in the MVP.
- The public catalog (product browsing, search, detail pages) was removed in
  CP12.2 — GEEDYX is a private admin application with no public views.
- Future evolution may expand GEEDYX into a broader product/inventory
  administration platform.
- Future features are described in [ROADMAP.md](./ROADMAP.md). Nothing that is
  not yet implemented is presented here as done.

## Status

The API foundation is in place: authentication, category CRUD, product CRUD
(browse, search, view details, manage products/categories/stock) and product
images (upload/replace/delete with local filesystem storage) are
**implemented** on the backend. The administration UI (checkpoints 07–09), the
MVP hardening/release pass (checkpoint 11), the Design System / UI refinement
(checkpoint 12) and the bootstrap + dev-tooling pass (checkpoints 12.1–12.2)
are **implemented** in the workspace; the advanced inventory dashboard and its
statistics remain planned (V1). The public catalog was removed in CP12.2 —
GEEDYX exposes only the administration console to the browser.
See [ARCHITECTURE.md](./ARCHITECTURE.md), [UI.md](./UI.md),
[API.md](./API.md) and [ROADMAP.md](./ROADMAP.md).