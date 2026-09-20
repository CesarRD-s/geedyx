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
- Vitest: 1 archivo, 2 pruebas, 2 correctas.
- Prisma Client: generado correctamente.
- NestJS: compilado correctamente.
- Next.js: compilado correctamente con Turbopack.

## Smoke test de API sin base de datos

La API compilada se levantó sin PostgreSQL para verificar la separación entre liveness y readiness:

- `GET /health/live` → `200`, servicio vivo.
- `GET /health/ready` → `503`, dependencia PostgreSQL no disponible.
- `GET /api/v1/setup/status` → `503`, respuesta Problem Details segura con `DATABASE_UNAVAILABLE`.

Esto confirma que la caída de PostgreSQL no impide saber si el proceso está vivo y que el detalle técnico no se expone al cliente.

## Pendiente de infraestructura local

El entorno de trabajo no tiene Docker ni PostgreSQL instalados. Por eso todavía no se ejecutaron:

```text
pnpm db:migrate
pnpm db:seed
```

En una máquina con PostgreSQL disponible, el siguiente paso es aplicar la migración inicial y validar el flujo completo de `PENDING`, creación del Owner, `COMPLETED`, auditoría e idempotencia mediante pruebas de integración.
