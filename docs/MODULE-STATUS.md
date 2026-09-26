# Geedyx — Estado de módulos

Este tablero registra el estado de implementación, no sustituye los documentos funcionales.

## Ruta de ejecución acordada

El desarrollo seguirá dependencias funcionales y no únicamente el número del
tablero. Cada módulo puede dividirse en rebanadas verticales pequeñas, pero no
se marcará como `COMPLETADO` hasta cerrar todos sus criterios de aceptación.

La definición de terminado exige tres comprobaciones consecutivas:

```text
Plan funcional
→ Código y validaciones técnicas
→ Validación visual como usuario real
→ COMPLETADO
```

Una compilación correcta o una API funcional no cierran por sí solas un módulo.
La interfaz debe recorrerse visualmente con sus flujos principales, estados de
error y datos de prueba antes de aceptar el módulo.

### Fase 1 — Autenticación mínima

Primera entrega de `AUTH-USERS`:

- Login con mensaje genérico para credenciales inválidas.
- Sesión server-side revocable.
- Cookie segura y protección de rutas.
- `GET /auth/me`.
- Logout y revocación de la sesión actual.
- Guard de autenticación y contexto de roles/permisos para el cliente.
- UI de login con estados de carga, error y éxito.
- Pruebas unitarias, integración API + PostgreSQL y flujo protegido.

#### Avance de la primera rebanada

Implementado y validado técnicamente:

- Sesiones server-side opacas con hash SHA-256, expiración por inactividad de
  30 minutos, expiración absoluta de 8 horas y revocación.
- Login con Argon2id, mensaje genérico para credenciales inválidas, bloqueo
  automático después de 5 fallos durante 15 minutos y auditoría de seguridad.
- Protección CSRF para login y logout mediante cookie legible más header
  validado en el servidor.
- `GET /auth/me`, logout, guard de sesión y límite inicial de 5 sesiones.
- `/login` y `/app` con estados de carga, error, sesión activa y cierre de
  sesión.
- Smoke test contra PostgreSQL real cubriendo setup, CSRF, login, `me`, logout
  y rechazo de la sesión revocada.
- Validación visual en navegador del error de login, acceso protegido y logout.

Esta rebanada queda cerrada visualmente. El módulo completo continúa en
`IMPLEMENTACIÓN` porque aún faltan administración de usuarios, sesiones
remotas, RBAC administrativo, rate limits, recuperación y cambio de contraseña.

### Fase 2 — Cierre de instalación inicial

El API de instalación y la primera rebanada web ya están implementados. La
rebanada todavía no se marca como completada porque requiere validación contra
PostgreSQL con estado `PENDING` y recorrido visual del flujo completo.

Implementado y validado técnicamente:

- Cliente web para `GET /api/v1/setup/status` y `POST /api/v1/setup/owner`.
- Pantalla pública `/setup` con asistente de bienvenida, verificaciones
  progresivas del funcionamiento, la conexión y el estado de instalación,
  estados de carga, error y reintento, con transición automática al formulario.
- El estado de instalación exige la fila singleton `Installation` y un
  catálogo de permisos preparado antes de permitir continuar.
- Entrada `/` preparada para enviar al usuario a instalación, acceso o espacio
  autenticado según el estado actual.
- Formulario del primer Owner con validación de nombre, correo y contraseña.
- Redirección de `/login` a `/setup` mientras la instalación está pendiente.
- Redirección de `/setup` a `/login` cuando la instalación está completada.
- Build de la Web con la ruta `/setup` generada correctamente.

Pendiente para cerrar:

- Prueba end-to-end del flujo completo con creación real del Owner.
- Confirmar el bloqueo del setup después de `COMPLETED` contra la API.

Validado en esta rebanada:

- PostgreSQL reiniciado en desarrollo con estado `PENDING`.
- `/health/live`, `/health/ready` y `/api/v1/setup/status` respondieron
  correctamente desde la Web.
- Recorrido visual del asistente: bienvenida, servidor, conexión, estado de
  instalación, “Todo está listo” y apertura automática del formulario.
- Envío vacío del formulario con errores de texto, sin bordes ni fondos rojos.
- Entrada sin API comprobada con mensaje de recuperación comprensible para el
  usuario.

### Fase 3 — Usuarios, sesiones y RBAC

- Administración de usuarios.
- Contraseña temporal y cambio obligatorio.
- Sesiones activas y revocación.
- Roles y permisos completos.
- Bloqueos, rate limits y recuperación controlada.
- Auditoría de operaciones sensibles.

### Fase 4 — Configuración general

- Empresa y regionalización.
- Zona horaria y moneda.
- Formatos de fecha y hora.
- Preferencias heredadas.
- Permisos, auditoría y estados pendientes.

### Fase 5 — Operación ERP

El orden posterior será:

```text
Productos y catálogo
→ Inventario
→ Clientes y proveedores
→ Ventas, comprobantes y pagos
→ Reportes
→ Auditoría administrativa
→ Panel operativo
```

| Orden | Módulo | Dependencias principales | Estado inicial | Evidencia de cierre |
| ---: | --- | --- | --- | --- |
| 0 | Base técnica del monorepo | Ninguna | `COMPLETADO` | `pnpm validate` pasa; `/health/live` 200 y `/health/ready` 503 seguro sin PostgreSQL. |
| 1 | Autenticación y usuarios | Base técnica | `IMPLEMENTACIÓN` | Primera rebanada de login y sesión cerrada; administración, RBAC completo, rate limits, recuperación y cambio de contraseña pendientes. |
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
- `pnpm validate`: formato, ESLint, TypeScript, 5 pruebas unitarias, generación Prisma, compilación NestJS y compilación Next.js pasan.
- `pnpm db:migrate:deploy`: migración inicial aplicada contra PostgreSQL 17.
- `pnpm db:seed`: instalación inicial y catálogo de permisos creados correctamente.
- `pnpm db:status`: esquema actualizado.
- `pnpm api:smoke`: conexión API + PostgreSQL, setup, idempotencia y errores esperados validados.
- `pnpm api:smoke`: además valida CSRF, login, sesión actual, logout y rechazo de una sesión revocada.
- Validación visual en navegador: `/login`, credenciales inválidas, `/app` protegido y logout recorridos como usuario real.
- API compilada verificada sin PostgreSQL: `GET /health/live` responde `200`; `GET /health/ready` responde `503` sin exponer secretos ni stack trace.
- CI configurado para repetir PostgreSQL, migración, seed, build y smoke test.

## Regla de actualización

Un módulo solo pasa a `COMPLETADO` con evidencia reproducible en el repositorio. Si compila pero aún carece de pruebas, auditoría, permisos o estados de UI, permanece en `VALIDACIÓN`.
