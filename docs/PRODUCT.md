# GEEDYX - Product

## Purpose

GEEDYX is a private, single-company ERP. It is the operational source of truth
for a business: products, inventory, customers, orders, payments, invoices and
finance will be managed here over time.

GEEDYX does **not** provide a public storefront. A business may use its own
website, mobile app, Shopify, WooCommerce or another commerce system. Those
systems integrate with GEEDYX through a versioned API and signed webhooks.

## Users and boundaries

Internal users are employees or trusted operators. They use the private admin
console and receive permissions for the work they perform.

External buyers are customers of the business, not GEEDYX administrative users.
Their accounts, if the external store has them, remain owned by that store.
GEEDYX stores the customer and order data that it needs to operate the business.

One deployment serves one company. Multi-tenancy, a hosted SaaS control plane,
and a built-in storefront are out of scope.

## Product principles

- PostgreSQL is the source of truth for business facts.
- Published operational and financial documents are traceable and corrected by
  reversal, not silently overwritten.
- Inventory changes are movements, not direct edits of a balance.
- External integrations receive the least privilege needed and never access the
  administration API.
- The API contract is versioned, documented and stable for integrators.
- Security, auditability and recoverability take priority over feature count.

## Current implementation

The current repository contains a prototype foundation:

- a Next.js private administration console;
- a NestJS REST API backed by PostgreSQL and Prisma;
- a first-run administrator flow, login, persistent opaque browser sessions,
  CSRF protection and rate limiting;
- category and product CRUD, including simple `stock` values;
- local product-image upload and a basic dashboard.

These capabilities are implemented but are not yet the production platform
defined in this document. Persistent browser sessions, multiple internal users,
permissions and API versioning are now present. Audit logs, integration
credentials, inventory movements, orders, payments and financial records remain
planned.

## Product phases

The planned work and its order are defined in [ROADMAP.md](./ROADMAP.md).
Architecture and security decisions are documented before their implementation.
