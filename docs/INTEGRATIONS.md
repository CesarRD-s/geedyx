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

## Integration client foundation

Each store backend receives a separately managed integration client:

- client identifier and random secret generated once;
- only a hash of the secret is stored in GEEDYX;
- explicit scopes, such as `catalog.read`, `inventory.read`, `orders.write` and
  `customers.write`;
- expiry, rotation, revocation, rate limits and audit events;
- test and production credentials kept separate.

P1.5b implements private administration routes for creating, listing, rotating
and revoking clients. They require a browser session with `company.manage` and
recent authentication. Creation and rotation reveal a 256-bit secret only once;
PostgreSQL retains only its Argon2id hash. The server-side authentication
service rejects missing, expired and revoked credentials without revealing which
condition failed, and records successful use. No commerce route consumes these
credentials until its business domain exists. P1 intentionally does not expose
an operator UI for inactive connectors; that UI starts in Phase 3.

Declared scope names are reserved for later contracts. No scope grants a P1
business operation to an external client. Phase 3 defines only the scopes that
its implemented commerce routes consume.

Idempotency reserves a SHA-256 hash of a caller key and request for one client
and operation. A completed matching request replays its stored response. A key
with a different request conflicts, concurrent requests remain in progress,
and a failed action releases its reservation.

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

## Webhook foundation

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

P1.5c persists HTTPS endpoint configuration, encrypted signing secrets,
outbound delivery records and inbound provider event IDs. The endpoint secret
uses AES-256-GCM with `WEBHOOK_ENCRYPTION_KEY` outside PostgreSQL; it is shown
only at creation. HMAC-SHA256 signs `timestamp.payload` and verification uses a
constant-time comparison. A concrete provider-specific inbound route and a
delivery worker await a business event producer.

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
