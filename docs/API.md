# GEEDYX — API

## Status

Authentication, categories and products are **implemented** (`/auth/*`,
`/categories/*` and `/products/*`). The MVP admin dashboard reads live counts
from the authenticated product list and categories endpoints; a dedicated
`/dashboard/stats` endpoint (inventory statistics) remains **planned** for a
later milestone. Swagger/OpenAPI also remain **planned**.

The web application communicates with the API over REST. All endpoints are
relative to the API base URL, e.g. `http://localhost:3001`.

## Authentication

| Method | Path           | Description                    | Status     |
| ------ | -------------- | ------------------------------ | ---------- |
| POST   | `/auth/setup`  | Create the primary administrator | Implemented |
| POST   | `/auth/login`  | Log in, issue session cookie   | Implemented |
| GET    | `/auth/me`     | Return the current user        | Implemented |
| POST   | `/auth/logout` | End the session                | Implemented |
| POST   | `/auth/refresh`| Refresh the authentication session | Planned |

Authentication uses a JWT stored in an HttpOnly cookie (`geedyx_session`).
The JWT is never returned in JSON responses and never stored in localStorage.
See [SECURITY.md](./SECURITY.md) for the security details.

### POST `/auth/setup`

Creates the first administrator. Only runs while the `User` table is empty.

Request body:

```json
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "..."
}
```

Validation:

- `username`: required, non-empty string
- `email`: valid email
- `password`: required, non-empty, at least 8 characters

Responses:

- `201 Created` — admin created; the session cookie is set and the user is
  returned:

  ```json
  { "id": "...", "username": "admin", "email": "admin@example.com" }
  ```

- `400 Bad Request` — invalid body
- `403 Forbidden` — setup already completed (a user already exists)

### POST `/auth/login`

Validates credentials and issues a session cookie.

Request body:

```json
{
  "email": "admin@example.com",
  "password": "..."
}
```

Validation:

- `email`: valid email
- `password`: required, non-empty string

Responses:

- `200 OK` — credentials valid; session cookie set and the user returned.
- `400 Bad Request` — invalid body
- `401 Unauthorized` — invalid credentials. The same response is returned when
  the email does not exist or the password is wrong, so the email existence is
  not revealed.

### GET `/auth/me`

Returns the authenticated user. Requires a valid session cookie.

Responses:

- `200 OK`:

  ```json
  { "id": "...", "username": "admin", "email": "admin@example.com" }
  ```

- `401 Unauthorized` — missing or invalid session cookie

### POST `/auth/logout`

Clears the session cookie.

Responses:

- `204 No Content` — the cookie has been invalidated. Subsequent `/auth/me`
  calls with the old cookie return `401`.

## Products

The product CRUD endpoints are **implemented**. Read endpoints are public;
mutating endpoints (create, update, delete, image upload/delete) require a valid
session cookie from `POST /auth/login` (or `/auth/setup`).

| Method | Path                      | Description                  | Auth      | Status     |
| ------ | ------------------------- | ---------------------------- | --------- | ---------- |
| GET    | `/products`                          | List/filter products (paginated) | Public | Implemented |
| GET    | `/products/:id`                      | Product detail               | Public    | Implemented |
| GET    | `/products/slug/:slug`               | Product detail by slug       | Public    | Implemented |
| POST   | `/products`                          | Create a product             | Admin     | Implemented |
| PATCH  | `/products/:id`                      | Update a product             | Admin     | Implemented |
| DELETE | `/products/:id`                      | Delete a product             | Admin     | Implemented |
| POST   | `/products/:id/image`                | Upload/replace the product image | Admin  | Implemented |
| DELETE | `/products/:id/image`                | Remove the product image     | Admin     | Implemented |

The `slug` and `sku` are unique at the database level. The `slug` is derived
server-side from the `name` (same normalization as categories: accents removed,
lowercased, non-alphanumeric runs become `-`). Clients never send it.
`sku` is sent by the client and must be unique (see `409` responses).

**Price format:** prices are stored as PostgreSQL `NUMERIC(10, 2)` (see
ADR-012) and are always returned as a JSON number with at most two decimals,
e.g. `799.99`. Clients send prices as numbers with at most two decimals.

A product detail object looks like:

```json
{
  "id": "...",
  "name": "Laptop Dell Inspiron",
  "slug": "laptop-dell-inspiron",
  "sku": "DELL-INS-001",
  "description": "Laptop de prueba",
  "price": 799.99,
  "stock": 12,
  "lowStockThreshold": 4,
  "imageUrl": null,
  "isActive": true,
  "createdAt": "2026-09-10T18:54:40.326Z",
  "updatedAt": "2026-09-10T18:54:40.440Z",
  "category": { "id": "...", "name": "Electrónica", "slug": "electronica" }
}
```

### GET `/products`

Lists products with pagination, search and filters. Public; a session cookie is
optional. Without authentication, inactive products (`isActive: false`) are
never returned and the `isActive` filter is ignored. With a valid session
cookie the `isActive` filter can be used (e.g. to review inactive products).

Query parameters:

| Parameter    | Default | Description                                        |
| ------------ | ------- | -------------------------------------------------- |
| `page`       | `1`     | Page number, minimum `1`                           |
| `limit`      | `20`    | Page size, minimum `1`, maximum `100`              |
| `search`     | —       | Case-insensitive contains match on `name` **or** `sku` |
| `categoryId` | —       | Only products in that category                     |
| `isActive`   | —       | `true`/`false`; only honored with a session cookie |
| `sort`       | `createdAt` | One of `name`, `price`, `stock`, `createdAt`    |
| `order`      | `desc`  | `asc` or `desc`                                    |

Responses:

- `200 OK` — a page of list items (compact objects with
  `id, name, slug, sku, price, stock, lowStockThreshold, imageUrl, isActive,
  createdAt, updatedAt` plus the nested `category` object) and a `meta` object:

  ```json
  {
    "data": [
      { "id": "...", "name": "Laptop", "slug": "laptop", "sku": "DELL-001",
        "price": 799.99, "stock": 12, "lowStockThreshold": 4,
        "imageUrl": null, "isActive": true,
        "createdAt": "...", "updatedAt": "...",
        "category": { "id": "...", "name": "Electrónica", "slug": "electronica" } }
    ],
    "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  }
  ```

- `400 Bad Request` — invalid query parameters (e.g. `page=0`, `limit=101`,
  `sort=foo`, malformed `isActive`).

### GET `/products/:id`

Requires a session cookie only to inspect **inactive** products. Without a
valid session the endpoint behaves as a public read: inactive products are
never returned (`404`). With a valid session cookie the admin console can read
the full detail of inactive products too.

Responses:

- `200 OK` — product detail.
- `404 Not Found` — no product with that id, or (public access) the product is
  inactive.

### GET `/products/slug/:slug`

Responses:

- `200 OK` — product detail.
- `404 Not Found` — no product with that slug, or the product is inactive.

### POST `/products`

Requires a session cookie (`401` otherwise).

Request body (`name`, `sku`, `price` and `categoryId` are required):

```json
{
  "name": "Laptop Dell Inspiron",
  "sku": "DELL-INS-001",
  "description": "Laptop de prueba",
  "price": 799.99,
  "stock": 0,
  "lowStockThreshold": 5,
  "categoryId": "..."
}
```

Validation:

- `name`: required, non-empty string, at most 120 characters.
- `sku`: required, non-empty string, at most 80 characters.
- `description`: optional string, at most 1000 characters.
- `price`: required number ≥ 0, at most two decimals.
- `stock`: optional integer ≥ 0 (default `0`).
- `lowStockThreshold`: optional integer ≥ 0 (default `5`).
- `categoryId`: required, must reference an existing category.
- Unknown properties (e.g. `imageUrl` or `slug`) are rejected (`400`).

The `slug` is derived from `name`. If the derived slug is taken, a numeric
suffix is appended (`-2`, `-3`, …).

Responses:

- `201 Created` — the created product detail.
- `400 Bad Request` — invalid body.
- `401 Unauthorized` — missing/invalid session cookie.
- `404 Not Found` — the `categoryId` does not exist.
- `409 Conflict` — the `sku` is already used by another product.

### PATCH `/products/:id`

Requires a session cookie (`401` otherwise).

Request body (all fields optional, but at least one must be present):

```json
{ "name": "Laptop Inspiron 15", "price": 749.5, "stock": 3,
  "lowStockThreshold": 2, "description": "Nuevo", "isActive": false,
  "categoryId": "..." }
```

Validation:

- `name`: if provided, non-empty string, at most 120 characters. Changing the
  name regenerates the slug; a suffix is appended if the new slug is taken.
- `sku`: if provided, non-empty string, at most 80 characters.
- `description`: if provided, string or `null`, at most 1000 characters.
- `price`: if provided, number ≥ 0, at most two decimals.
- `stock` / `lowStockThreshold`: if provided, integer ≥ 0.
- `isActive`: if provided, boolean.
- `categoryId`: if provided, must reference an existing category.

Responses:

- `200 OK` — the updated product detail.
- `400 Bad Request` — invalid body or empty update (no configured fields).
- `401 Unauthorized` — missing/invalid session cookie.
- `404 Not Found` — no product with that id, or the category does not exist.
- `409 Conflict` — the new `sku` is already used by another product.

### DELETE `/products/:id`

Requires a session cookie (`401` otherwise).

Responses:

- `204 No Content` — the product was deleted. If the product had an image, its
  file is removed from storage too.
- `401 Unauthorized` — missing/invalid session cookie.
- `404 Not Found` — no product with that id.

### POST `/products/:id/image`

Uploads a new product image, or replaces the existing one. Requires a session
cookie (`401` otherwise). The request is `multipart/form-data` with a single
`file` field containing the image. Only **JPEG, PNG and WebP** are accepted
(`image/jpeg`, `image/png`, `image/webp`); SVG is deliberately rejected.

Validation:

- The file's MIME type must be one of the allowed types.
- The file's real content must match an allowed format (magic bytes are checked,
  the client-provided name/MIME alone is never trusted).
- Maximum size is `5 MB` by default, configurable via `MAX_IMAGE_SIZE_MB`.
- The stored filename is generated server-side (UUID); client filenames are
  never used for storage, so paths cannot escape the upload directory.

On success the response contains the **updated product detail** with its
`imageUrl` set to a server-relative public path such as
`/uploads/products/3d2a…f1.png`. The image is served statically from that path
with long, immutable cache headers. Uploading to a product that already has an
image replaces it: the old file is removed from storage and a new URL is
assigned.

Responses:

- `200 OK` — the updated product detail with the new `imageUrl`.
- `400 Bad Request` — the `file` field is missing, or the file is not a
  supported image (bad MIME or non-image content).
- `401 Unauthorized` — missing/invalid session cookie.
- `404 Not Found` — no product with that id.
- `413 Payload Too Large` — the file exceeds the configured size limit.

### DELETE `/products/:id/image`

Removes the product's image. Requires a session cookie (`401` otherwise).

Responses:

- `204 No Content` — the image was removed and its file deleted from storage.
- `401 Unauthorized` — missing/invalid session cookie.
- `404 Not Found` — no product with that id.

## Categories

The category CRUD endpoints are **implemented**. Read endpoints are public;
mutating endpoints (create, update, delete) require a valid session cookie from
`POST /auth/login` (or `/auth/setup`).

| Method | Path                  | Description                     | Auth      | Status     |
| ------ | --------------------- | ------------------------------- | --------- | ---------- |
| GET    | `/categories`         | List categories (by name)       | Public    | Implemented |
| GET    | `/categories/:id`     | Category detail                 | Public    | Implemented |
| GET    | `/categories/slug/:slug` | Category detail by slug       | Public    | Implemented |
| POST   | `/categories`         | Create a category               | Admin     | Implemented |
| PATCH  | `/categories/:id`     | Update a category               | Admin     | Implemented |
| DELETE | `/categories/:id`     | Delete a category               | Admin     | Implemented |

Categories are returned as minimal objects, ordered by name ascending:

```json
{ "id": "...", "name": "Electrónica", "slug": "electronica" }
```

The `slug` is derived server-side from the `name` (accents are removed,
lowercased, non-alphanumeric runs become `-`). Clients never send it.

### GET `/categories`

Lists all categories ordered by `name` ascending (no pagination/filters yet).

Responses:

- `200 OK` — array of minimal category objects.

### GET `/categories/:id`

Responses:

- `200 OK` — minimal category object.
- `404 Not Found` — no category with that id.

### GET `/categories/slug/:slug`

Responses:

- `200 OK` — minimal category object.
- `404 Not Found` — no category with that slug.

### POST `/categories`

Requires a session cookie (`401` otherwise).

Request body:

```json
{ "name": "Electrónica" }
```

Validation:

- `name`: required, non-empty string, at most 80 characters. Leading/trailing
  whitespace is trimmed and inner whitespace collapsed before generating the
  slug and setting the stored name.

Responses:

- `201 Created` — minimal category object with the generated slug.
- `400 Bad Request` — invalid body, or a name that produces an empty slug.
- `401 Unauthorized` — missing/invalid session cookie.
- `409 Conflict` — a category with the same normalized name (slug) already
  exists.

### PATCH `/categories/:id`

Requires a session cookie (`401` otherwise).

Request body (`name` is optional, but at least one field is required):

```json
{ "name": "Electrónica y Tecnología" }
```

Validation:

- `name`: if provided, non-empty string, at most 80 characters.

Responses:

- `200 OK` — the updated minimal category object. Changing the name
  regenerates the slug.
- `400 Bad Request` — invalid body or empty update (no configured fields).
- `401 Unauthorized` — missing/invalid session cookie.
- `404 Not Found` — no category with that id.
- `409 Conflict` — the new name maps to a slug already used by another
  category.

### DELETE `/categories/:id`

Requires a session cookie (`401` otherwise).

Responses:

- `204 No Content` — the category was deleted.
- `401 Unauthorized` — missing/invalid session cookie.
- `404 Not Found` — no category with that id.
- `409 Conflict` — the category still has products (deleting it would orphan
  them; the database `ON DELETE RESTRICT` constraint is respected, no cascade).

## Dashboard

| Method | Path              | Description                         |
| ------ | ----------------- | ----------------------------------- |
| GET    | `/dashboard/stats`| Inventory statistics for the admin (planned) |

The v1 admin dashboard does not call this endpoint: it reads live product and
category totals from the authenticated `GET /products` (page metadata `total`)
and `GET /categories`. A dedicated statistics endpoint will be added with the
inventory features.

## Notes

- Authentication details (cookie behavior, payloads, error formats) are
  specified above for the implemented endpoints.
- Swagger/OpenAPI will be added in a later milestone.