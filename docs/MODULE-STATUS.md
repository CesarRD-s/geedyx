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
- `GET /auth/me` conserva la expiración de inactividad y las solicitudes que
  cambian estado renuevan la actividad de forma explícita.
- En producción la configuración exige cookies `Secure`; las operaciones de
  límite de sesiones se procesan con transacciones serializables y reintentos
  acotados, y el contador de fallos usa incrementos atómicos bajo concurrencia.
- `/login` y `/app` con estados de carga, error, sesión activa y cierre de
  sesión.
- `/login` muestra las sesiones activas cuando se alcanza el límite y permite
  revocar una para continuar con el acceso.
- Smoke test contra PostgreSQL real cubriendo setup, CSRF, login, `me`,
  expiración sin renovación automática, límite de sesiones, revocación, logout
  y rechazo de la sesión revocada.
- Validación visual en navegador del error de login, acceso protegido y logout.

Esta rebanada queda cerrada visualmente. El módulo completo continúa en
`IMPLEMENTACIÓN` porque aún faltan administración de usuarios, sesiones
remotas, RBAC administrativo, rate limits, recuperación y cambio de contraseña.

### Fase 2 — Cierre de instalación inicial

El API de instalación y la primera rebanada web están implementados y
validados de extremo a extremo contra PostgreSQL.

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

Validado en esta rebanada:

- PostgreSQL reiniciado en desarrollo con estado `PENDING`.
- Smoke test real desde `PENDING` hasta `COMPLETED`, incluyendo creación del
  Owner, permisos, empresa, rol, auditoría e idempotencia.
- Rechazo `409 INSTALLATION_COMPLETED` al intentar crear otro Owner después de
  completar la instalación.
- Login, sesión actual, logout y rechazo de la sesión revocada contra la API.
- `/health/live`, `/health/ready` y `/api/v1/setup/status` respondieron
  correctamente desde la Web.
- Recorrido visual del asistente: bienvenida, servidor, conexión, estado de
  instalación, “Todo está listo” y apertura automática del formulario.
- Envío vacío del formulario con errores de texto, sin bordes ni fondos rojos.
- Entrada sin API comprobada con mensaje de recuperación comprensible para el
  usuario.
- Revisión del 2026-10-03: la creación del Owner pasa directamente al login sin
  repetir las verificaciones iniciales; `/setup` con instalación completada
  redirige con carga breve. El login confirma una vez el nombre y correo del
  Owner creado y deja ese correo completado. El recorrido se probó en bases
  temporales aisladas.

Estado de la fase: `COMPLETADA`.

### Fase 3 — Usuarios, sesiones y RBAC

- Administración de usuarios y contraseña temporal con cambio obligatorio.
- Sesiones activas y revocación.
- Roles y permisos completos.
- Bloqueos, rate limits y recuperación controlada.
- Auditoría de operaciones sensibles.

#### Primera rebanada de usuarios

Implementado y validado técnicamente:

- `GET /users` y `POST /users` protegidos por sesión y permisos
  `users.read`/`users.manage`.
- Creación de usuarios dentro de la empresa del actor, con correo único,
  contraseña temporal de un solo momento y vencimiento de 24 horas.
- Auditoría de creación sin registrar la contraseña temporal.
- Login restringido para usuarios con cambio de contraseña pendiente.
- `POST /auth/password` para completar el primer acceso y revocar las demás
  sesiones del usuario.
- `/app/users` con listado, estados de carga/error/vacío, creación y entrega
  visual de la contraseña temporal.
- `/app/password` con validación de la nueva contraseña y redirección al panel
  después del cambio.

Estado de la rebanada: `VALIDACIÓN`.

El módulo completo continúa en `IMPLEMENTACIÓN` porque aún faltan activación,
desactivación y bloqueo administrativos, asignación de roles, consulta remota
de sesiones, rate limits, recuperación y auditoría administrativa.

#### Administración y seguridad administrativa

Implementado en la siguiente rebanada:

- Activación, desactivación y bloqueo administrativo con motivo y revocación de
  sesiones asociadas.
- Protección del último Owner activo.
- Roles de sistema `OWNER`, `ADMIN` y `USER`, con asignación por usuario y
  validación server-side.
- Consulta y revocación de sesiones propias y sesiones de usuarios autorizados.
- Regeneración de contraseña temporal con expiración y revocación de sesiones.
- Consulta administrativa de auditoría con filtros por módulo, acción, resultado
  y entidad o requestId.

La recuperación controlada, los límites secundarios por origen y la
reautenticación para cambios sobre Owners permanecen pendientes para cerrar el
módulo completo.

Estado de esta rebanada: `VALIDACIÓN`.

#### Shell inicial del espacio de trabajo

Implementado y validado visualmente:

- `/app` redirige a `/app/dashboard`, que es la ruta explícita del Panel
  operativo.
- `AppShell` concentra sidebar, header, sesión, tema, reloj regional y logout;
  las pantallas no duplican esa estructura.
- La navegación se organiza por módulos padre e hijos: Ventas, Catálogo,
  Inventario, Clientes y proveedores, Reportes, Usuarios, Seguridad, Auditoría
  y Configuración.
- Los módulos y sus hijos se filtran por permisos, el grupo activo se abre al
  entrar a una ruta y el estado puede fijarse o conservarse localmente.
- Desktop usa sidebar compacta con expansión por hover/focus y modo fijado;
  móvil usa drawer con cierre por Escape, botón de cierre y capa exterior.
- Las rutas funcionales pendientes tienen un destino estructural para que el
  menú no produzca enlaces rotos mientras cada módulo se implementa.

Estado del shell: `VALIDACIÓN`.

#### Componentes UX compartidos

Implementado y disponible para los módulos nuevos:

- `FeedbackAlert` para estados persistentes y errores contextuales.
- `ToastProvider` y `useToast` para resultados breves de operaciones.
- `ConfirmDialog` para acciones administrativas sensibles.
- Estados de carga, vacío, error y permiso en las pantallas de configuración,
  catálogo, sesiones, roles y auditoría.

Estado de la rebanada: `VALIDACIÓN`.

### Fase 4 — Configuración general

- Empresa y regionalización.
- Zona horaria y moneda.
- Formatos de fecha y hora.
- Preferencias heredadas.
- Permisos, auditoría y estados pendientes.

#### Primera rebanada de configuración

Implementado:

- `GET /configuration` y `PATCH /configuration` protegidos por sesión y
  permisos.
- Identidad del negocio, país, logo opcional, zona horaria, moneda, idioma y
  formatos de fecha y hora.
- Validación server-side, auditoría de cambios y cálculo de configuración
  completa o pendiente.
- `/app/configuration/company` con alerta persistente, formulario y toast de
  confirmación.
- El Panel operativo muestra la configuración pendiente y un acceso directo.

Estado de la rebanada: `VALIDACIÓN`.

Pendientes funcionales que deben cerrarse antes de completar el módulo:

- Preferencias individuales de idioma y zona horaria con persistencia real,
  herencia desde la configuración global y efecto visible en la consola.
- Restablecimiento de preferencias y configuración con permisos, confirmación y
  auditoría cuando corresponda.

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
| 1 | Autenticación y usuarios | Base técnica | `IMPLEMENTACIÓN` | Login, sesiones y primera rebanada de usuarios con contraseña temporal; activación, RBAC completo, rate limits, recuperación y administración avanzada pendientes. |
| 2 | Configuración general | Instalación, identidad | `VALIDACIÓN` | Empresa, regionalización, configuración pendiente, permisos y auditoría inicial implementados; preferencias individuales y restablecimiento avanzado pendientes. |
| 3 | Instalación inicial | Base técnica, identidad mínima | `COMPLETADO` | Setup PENDING/COMPLETED, primer Owner transaccional, idempotencia, UI y e2e. |
| 4 | Productos y catálogo | Identidad, configuración | `VALIDACIÓN` | Categorías, producto base con primera variante, precio inicial, permisos, vistas iniciales y auditoría implementados; paginación, selector de cantidad, scroll horizontal para tablas, variantes avanzadas, multimedia y archivado UI pendientes. |
| 5 | Inventario operativo | Productos | `PENDIENTE` | Saldos, movimientos inmutables, ajustes, disponibilidad y pruebas transaccionales. |
| 6 | Clientes y proveedores | Identidad, configuración | `PENDIENTE` | Registros comerciales, estados, permisos, relaciones y auditoría. |
| 7 | Ventas, comprobantes y pagos | Productos, inventario, clientes | `PENDIENTE` | Venta interna, efectivo/transferencia, comprobante, cancelación/devolución. |
| 8 | Reportes operativos | Ventas, inventario, pagos | `PENDIENTE` | Ventas, inventario y pagos con filtros por contexto regional. |
| 9 | Auditoría transversal | Todos los módulos | `VALIDACIÓN` | Registro central inmutable, consulta administrativa y filtros iniciales implementados; paginación, selector de cantidad y detalle avanzado pendientes. |
| 10 | Panel operativo | Configuración, ventas, inventario, auditoría | `PENDIENTE` | Indicadores, actividad, alertas, acciones rápidas y permisos. |

## Evidencia actual

- Validación ejecutada el 03/10/2026 en Node.js 24.16.0 y pnpm 11.19.0.
- `pnpm validate`: formato, ESLint, TypeScript, 6 pruebas unitarias, generación Prisma, compilación NestJS y compilación Next.js pasan.
- `pnpm db:migrate:deploy`: cinco migraciones aplicadas contra PostgreSQL 17,
  incluida la de configuración y catálogo inicial.
- `pnpm db:seed`: instalación inicial y catálogo de permisos creados correctamente.
- `pnpm db:status`: esquema actualizado.
- `pnpm api:smoke`: conexión API + PostgreSQL, setup, idempotencia y errores esperados validados.
- `pnpm api:smoke`: además valida CSRF, login, usuarios, contraseña temporal, cambio obligatorio, sesión actual, logout y rechazo de una sesión revocada.
- Validación visual en navegador: `/login`, credenciales inválidas, `/app` protegido, usuarios, primer acceso y logout recorridos como usuario real.
- Validación visual adicional: Panel con alerta de configuración pendiente,
  Empresa, Productos, Categorías, Roles y permisos, Sesiones activas y Registro
  de auditoría.
- Smoke no destructivo con `admin@geedyx.test`: login, roles de sistema,
  configuración, creación de categoría, creación de producto, consulta de
  auditoría y sesiones activas respondieron correctamente.
- API compilada verificada sin PostgreSQL: `GET /health/live` responde `200`; `GET /health/ready` responde `503` sin exponer secretos ni stack trace.
- CI configurado para repetir PostgreSQL, migración, seed, build y smoke test.

## Regla de actualización

Un módulo solo pasa a `COMPLETADO` con evidencia reproducible en el repositorio. Si compila pero aún carece de pruebas, auditoría, permisos o estados de UI, permanece en `VALIDACIÓN`.
