# Geedyx — Decisiones técnicas iniciales

## ADR-001 — Monorepo con pnpm workspaces

Se usa pnpm workspaces sin añadir un orquestador adicional en la primera base. Los filtros y el paralelismo de pnpm cubren los scripts de web, API, contratos y base de datos con menor superficie operativa. Se podrá incorporar Turborepo si el tiempo de build o el cache de tareas lo justifica.

## ADR-002 — Next.js App Router y NestJS separado

Next.js es la aplicación administrativa y NestJS es la autoridad para autenticación, autorización, validación, reglas de negocio y acceso a PostgreSQL. La Web no importa el cliente de Prisma ni accede directamente a la base de datos.

## ADR-003 — Prisma 7 estable

Prisma 7.10.0 se utiliza para schema, migraciones, generación de cliente y transacciones. Prisma 8 aparece como release candidate en la documentación consultada; se pospone hasta que sea estable y compatible con la aplicación.

## ADR-004 — Contrato HTTP uniforme

Las respuestas exitosas se envuelven en `data` y `meta.requestId`. Los errores usan Problem Details con `code`, `requestId`, `instance` y errores de campo cuando corresponda.

## ADR-005 — Base funcional mínima antes de los módulos ERP

La primera iteración entrega monorepo, configuración, salud, migración inicial y setup. No se implementan productos, inventario, clientes o ventas hasta cerrar sus dependencias y criterios de aceptación.
