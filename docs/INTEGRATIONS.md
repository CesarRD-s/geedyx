# GEEDYX - Integrations

## Purpose

GEEDYX exposes operational capabilities to an external store or connector. An
integration is a backend-to-backend relationship; it is not an administrator
session and it is not a browser API key.

## Responsibilities

| System | Owns |
| --- | --- |
| GEEDYX | Products, inventory, operational customers, order records, invoices, payments and finance. |
| External store | Public experience, cart UI, buyer authentication, checkout UI and its storefront-specific data. |
| Payment provider | Cardholder data and payment authorization. |

The integration contract decides which business event is authoritative. A store
must not assume a browser redirect means a payment has completed; the verified
provider webhook decides that result.

## Integration client - planned

Each store backend receives a separately managed integration client:

- client identifier and random secret generated once;
- only a hash of the secret is stored in GEEDYX;
- explicit scopes, such as `catalog.read`, `inventory.read`, `orders.write` and
  `customers.write`;
- expiry, rotation, revocation, rate limits and audit events;
- test and production credentials kept separate.

No integration secret may be embedded in JavaScript, mobile binaries or a public
storefront. Browser catalog access uses only `/api/v1/public/*` resources.

## Commerce flow - planned

1. A store reads published products and availability through a least-privilege
   API contract.
2. The store creates or updates its own cart.
3. The store backend submits an order to GEEDYX with `Idempotency-Key`.
4. GEEDYX validates price/inventory rules and returns an operational order state.
5. Payment confirmation enters through a verified provider or store webhook.
6. GEEDYX records the payment, transitions the order, reserves/releases stock
   as appropriate and records audit events.

Exact reservation timing is a Phase 3 decision; no store is allowed to mutate a
product's stock balance directly.

## Webhooks - planned

GEEDYX delivers outbound events for data that an external system must reconcile,
such as product publication, stock change, order state and invoice issuance.

- Payloads have event IDs, timestamps, version and HMAC signature.
- Receivers acknowledge quickly and process asynchronously.
- Delivery is retried with a bounded policy and recorded for inspection.
- Receivers deduplicate event IDs.
- Events contain references and necessary snapshots, never secrets or payment
  card data.

Inbound webhooks use a provider-specific signature check over the raw body,
timestamp/replay protection and persistent event deduplication before changing
business state.

## Payments - planned

Payment providers are adapters selected by a business configuration. GEEDYX will
support hosted checkout or provider elements first to avoid processing raw card
data. The payment model records attempts, provider references, status,
reversals/refunds and disputes. It never stores PAN, CVV or provider secrets in
business rows.

## Contract lifecycle

`/api/v1` is the first stable integration version. Additive changes are allowed
within a version. Breaking changes require a new URI major version, an OpenAPI
diff, migration guidance and a deprecation period. See [API.md](./API.md).
