# GEEDYX — Database

## Primary database

PostgreSQL is the primary database (see [DECISIONS.md](./DECISIONS.md)).

Local development uses Docker Compose (`docker compose up -d`), see the
[docker-compose.yml](../docker-compose.yml) at the repository root.

## ORM

Prisma is the data access layer. Prisma is owned by the NestJS API:

- The NestJS API owns all database access and business logic.
- The frontend must never access Prisma directly.
- The connection string (`DATABASE_URL`) is configured in the API environment
  and read through the Prisma configuration and the `PrismaPg` driver adapter.
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full stack diagram.

## Prisma setup

- Schema: `apps/api/prisma/schema.prisma` (domain models below).
- CLI config: `apps/api/prisma.config.ts` (reads `DATABASE_URL`).
- Generated client: compiled into `apps/api/src/generated/prisma` (gitignored,
  regenerated with `prisma generate`).
- The client is connected using the `PrismaPg` driver adapter (node-postgres).
- Connection lifecycle is handled by the NestJS `PrismaService`
  (`apps/api/src/prisma/prisma.service.ts`), which connects on module init and
  disconnects on module destroy.

## Migration strategy

- All schema changes are managed with Prisma Migrations.
- The `apps/api/prisma/migrations` directory holds migration history.
- The `_prisma_migrations` table in PostgreSQL tracks applied migrations.
- Applied migrations:

| Migration | Contents |
| --------- | -------- |
| `add_user_category_product` | Initial `User`, `Category` and `Product` models |

## Development database workflow

```bash
# 1. Start PostgreSQL (Docker)
docker compose up -d

# 2. Install dependencies (already contains .env with DATABASE_URL)
pnpm install

# 3. Regenerate the Prisma client after schema changes
pnpm db:generate

# 4. Create and apply a development migration (name the migration)
pnpm db:migrate -- --name <migration_name>

# 5. Apply pending migrations without creating new ones (e.g. deploy)
pnpm db:migrate:deploy

# 6. Open Prisma Studio
pnpm db:studio
```

Environment variables:

- `DATABASE_URL` — full PostgreSQL connection string used by Prisma.
- Local development values live in `apps/api/.env` (gitignored);
  `apps/api/.env.example` documents the required variables.

## Implemented models

The following models are implemented in the Prisma schema and applied to the
database. There is no application/business logic around them yet.

### User

Stores application users. The MVP has a single administrator, but the model
does not prevent future multiple users.

| Field        | Type     | Notes                 |
| ------------ | -------- | --------------------- |
| id           | string   | Primary key, CUID     |
| username     | string   | Unique                |
| email        | string   | Unique                |
| passwordHash | string   | Never plaintext       |
| createdAt    | datetime |                       |
| updatedAt    | datetime |                       |

Constraints: unique `username` and `email` (auto indexes).

### Category

Product categories. A category can contain many products.

| Field     | Type     | Notes             |
| --------- | -------- | ----------------- |
| id        | string   | Primary key, CUID |
| name      | string   | Required          |
| slug      | string   | Unique            |
| createdAt | datetime |                   |
| updatedAt | datetime |                   |

Constraints: unique `slug` (auto index).

### Product

Products in the catalog. Each product belongs to exactly one category.

| Field            | Type     | Notes                                   |
| ---------------- | -------- | --------------------------------------- |
| id               | string   | Primary key, CUID                       |
| name             | string   | Required                                |
| slug             | string   | Unique                                  |
| sku              | string   | Unique                                  |
| description      | string?  | Optional                                |
| price            | numeric  | `Decimal(10,2)`, never floating-point   |
| stock            | integer  | Default 0; non-negative enforced in business rules |
| lowStockThreshold| integer  | Default 5                               |
| imageUrl         | string?  | URL/path, not the image binary          |
| isActive         | boolean  | Default true                            |
| categoryId       | string   | Required FK to Category                 |
| createdAt        | datetime |                                         |
| updatedAt        | datetime |                                         |

Constraints:

- unique `slug` and `sku` (auto indexes);
- index on `categoryId`;
- foreign key `categoryId -> Category(id)` with `ON UPDATE CASCADE` and
  `ON DELETE RESTRICT` (a category cannot be deleted while it still has
  products).

### Price representation

Monetary values use PostgreSQL `NUMERIC(10, 2)` via Prisma
`Decimal @db.Decimal(10, 2)`. Floating-point types are not used for money.

### Stock constraints

`stock` and `lowStockThreshold` are integers. Negative stock is prevented by
application business rules (to be implemented with the Products feature), not
by a database check constraint.

## Relationships (implemented)

```text
Category 1 ---- N Product
```

A category can contain many products; a product belongs to exactly one category.
On deletion, a category with products is restricted.

## Image storage

The database stores the image URL/path (`imageUrl`), never the image binary.
Files are stored via a `StorageService` (local filesystem in the MVP, see
[ARCHITECTURE.md](./ARCHITECTURE.md)).

## Planned models (not implemented)

The following are planned for future checkpoints and do not exist yet:

- inventory movements / stock history;
- suppliers;
- purchases / orders;
- warehouses;
- reports.

In particular, no inventory movement history exists yet: stock changes are not
tracked in the data model at this stage.