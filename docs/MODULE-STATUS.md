# Geedyx — Estado de módulos

Este tablero registra el estado de implementación, no sustituye los documentos funcionales.

| Orden | Módulo | Dependencias principales | Estado inicial | Evidencia de cierre |
| ---: | --- | --- | --- | --- |
| 0 | Base técnica del monorepo | Ninguna | `COMPLETADO` | `pnpm validate` pasa; `/health/live` 200 y `/health/ready` 503 seguro sin PostgreSQL. |
| 1 | Autenticación y usuarios | Base técnica | `PENDIENTE` | Login, sesiones opacas, RBAC, rate limits, recuperación, auditoría y pruebas. |
| 2 | Configuración general | Instalación, identidad | `PENDIENTE` | Empresa, regionalización, preferencias heredadas, permisos y auditoría. |
| 3 | Instalación inicial | Base técnica, identidad mínima | `IMPLEMENTACIÓN` | Setup PENDING/COMPLETED, primer Owner transaccional, idempotencia, UI y e2e. |
| 4 | Productos y catálogo | Identidad, configuración | `PENDIENTE` | Categorías, productos, variantes, precios, multimedia, permisos y auditoría. |
| 5 | Inventario operativo | Productos | `PENDIENTE` | Saldos, movimientos inmutables, ajustes, disponibilidad y pruebas transaccionales. |
| 6 | Clientes y proveedores | Identidad, configuración | `PENDIENTE` | Registros comerciales, estados, permisos, relaciones y auditoría. |
| 7 | Ventas, comprobantes y pagos | Productos, inventario, clientes | `PENDIENTE` | Venta interna, efectivo/transferencia, comprobante, cancelación/devolución. |
| 8 | Reportes operativos | Ventas, inventario, pagos | `PENDIENTE` | Ventas, inventario y pagos con filtros por contexto regional. |
| 9 | Auditoría transversal | Todos los módulos | `IMPLEMENTACIÓN` | Registro central inmutable, consulta administrativa y filtros. |
| 10 | Panel operativo | Configuración, ventas, inventario, auditoría | `PENDIENTE` | Indicadores, actividad, alertas, acciones rápidas y permisos. |

## Evidencia actual

- Validación ejecutada el 20/09/2026 en Node.js 24.16.0 y pnpm 11.19.0.
- `pnpm validate`: formato, ESLint, TypeScript, 2 pruebas unitarias, generación Prisma, compilación NestJS y compilación Next.js pasan.
- API compilada verificada sin PostgreSQL: `GET /health/live` responde `200`; `GET /health/ready` responde `503` sin exponer secretos ni stack trace.
- La migración y el seed requieren PostgreSQL disponible. Docker no está instalado en el entorno actual, por lo que esa parte queda pendiente de ejecutar en una máquina con PostgreSQL o Docker.

## Regla de actualización

Un módulo solo pasa a `COMPLETADO` con evidencia reproducible en el repositorio. Si compila pero aún carece de pruebas, auditoría, permisos o estados de UI, permanece en `VALIDACIÓN`.
