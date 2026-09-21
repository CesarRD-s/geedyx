# Geedyx — Validación de la base técnica

## Entorno

- Node.js `24.16.0`.
- pnpm `11.19.0`.
- Next.js `16.3.4`.
- React `19.2.8`.
- NestJS `12.0.3` resuelto en el lockfile.
- Prisma ORM `7.10.0`.
- PostgreSQL objetivo: `17` en `docker-compose.yml`.

## Comando de cierre

```text
pnpm validate
```

Resultado verificado:

- Prettier: correcto.
- ESLint API y Web: correcto.
- TypeScript en contratos, database, API y Web: correcto.
- Vitest: 2 archivos, 5 pruebas, 5 correctas.
- Prisma Client: generado correctamente.
- NestJS: compilado correctamente.
- Next.js: compilado correctamente con Turbopack.

## Smoke test de API con base de datos

El smoke test automatizado se ejecuta con:

```text
pnpm api:smoke
```

Con la API levantada y una base limpia, valida:

- Conexión real API → PostgreSQL mediante `GET /health/ready`.
- Estado inicial `PENDING` mediante `GET /api/v1/setup/status`.
- Error esperado `422` para un owner inválido.
- Creación real del Owner y transición a `COMPLETED`.
- Repetición idempotente de la misma operación.
- Error esperado `409` al reutilizar la clave con datos diferentes.
- Estado final `COMPLETED`.

El workflow de CI levanta PostgreSQL, aplica migraciones, ejecuta el seed,
compila la API y ejecuta este smoke test automáticamente.

Resultado verificado localmente:

- Contenedor `geedyx-postgres-1`: `healthy`.
- `pnpm db:migrate:deploy`: migración inicial aplicada correctamente.
- `pnpm db:seed`: instalación inicial y permisos creados correctamente.
- `pnpm db:status`: esquema actualizado.
- API compilada: inició correctamente en el puerto `4000`.
- `pnpm api:smoke`: conexión API → PostgreSQL y escenarios esperados correctos.

## Smoke test de API sin base de datos

La API compilada se levantó sin PostgreSQL para verificar la separación entre liveness y readiness:

- `GET /health/live` → `200`, servicio vivo.
- `GET /health/ready` → `503`, dependencia PostgreSQL no disponible.
- `GET /api/v1/setup/status` → `503`, respuesta Problem Details segura con `DATABASE_UNAVAILABLE`.

Esto confirma que la caída de PostgreSQL no impide saber si el proceso está vivo y que el detalle técnico no se expone al cliente.

## Estado de infraestructura local

Docker Desktop está instalado y activo. PostgreSQL se está ejecutando mediante
`docker compose` en el contenedor `geedyx-postgres-1`.

Los comandos ejecutados fueron:

```text
docker compose up -d postgres
pnpm db:migrate:deploy
pnpm db:seed
pnpm api:smoke
```

La API temporal se detuvo después de la prueba. El contenedor PostgreSQL quedó
activo para continuar el desarrollo local.
