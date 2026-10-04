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
- Vitest: 2 archivos, 6 pruebas, 6 correctas.
- Prisma Client: generado correctamente.
- NestJS: compilado correctamente.
- Next.js: compilado correctamente con Turbopack.

## Preparación del entorno

La preparación también valida las condiciones que no corresponde simular en la
interfaz:

- `pnpm install --frozen-lockfile` confirma que las dependencias coinciden con
  `pnpm-lock.yaml`;
- `ConfigModule` valida las variables de entorno antes de iniciar la API;
- `pnpm db:generate`, `pnpm db:migrate:deploy` y `pnpm db:seed` confirman que
  Prisma, el esquema y los datos iniciales pueden prepararse;
- `pnpm validate` confirma formato, lint, tipos, pruebas y compilaciones;
- CI repite esta secuencia en un entorno limpio con PostgreSQL.

Si falta una dependencia, una variable inválida o falla un script de
preparación, el proceso de arranque o CI falla. La pantalla `/setup` no muestra
un check ficticio para esos casos: muestra únicamente estados respaldados por
la API.

## Diagnóstico durante el desarrollo

La API utiliza los logs de NestJS para registrar únicamente datos operativos
seguros:

- `health.ready.failed`: la comprobación de PostgreSQL falló;
- `setup.status.failed`: no se pudo consultar el estado de instalación;
- `setup.status.incomplete`: falta la fila `Installation` o el catálogo de
  permisos;
- `setup.status.checked`: estado encontrado, cantidad de permisos y `ready`;
- `setup.owner.failed`: ocurrió un error inesperado al crear el Owner.

Cada registro incluye el `requestId`, por lo que puede relacionarse con la
respuesta que recibió la Web. En desarrollo, la Web registra una advertencia
en la consola si la API no responde o devuelve un error HTTP inesperado,
incluyendo ruta, estado, código y `requestId`. Las respuestas previstas del
flujo, como `401` al consultar una sesión inexistente o rechazar credenciales
y `409`/`422` al crear el Owner, se gestionan en la interfaz sin generar un
error de consola.

No se registran contraseñas, cookies, payloads sensibles ni cadenas de
conexión. Si aparece `permissionCatalog: "missing"` o
`installationRecord: "missing"`, debe ejecutarse `pnpm db:seed`.

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
- Login con cinco sesiones activas y respuesta `409 SESSION_LIMIT_REACHED` con
  la lista de sesiones revocables.
- Revocación de una sesión mediante el desafío temporal y creación posterior
  de la nueva sesión.
- Dos intentos concurrentes al alcanzar el límite de sesiones.
- Cinco fallos de login concurrentes y rechazo posterior por bloqueo temporal.
- Listado de usuarios con permiso, creación de una cuenta y rechazo de correo
  duplicado.
- Login con contraseña temporal, cambio obligatorio, revocación de sesiones
  restantes y rechazo posterior de la contraseña temporal.
- `GET /auth/me` sin renovación de la expiración por inactividad.
- Logout protegido por CSRF y rechazo posterior de la sesión revocada.

La cobertura automatizada se concentra en estos recorridos de mayor riesgo y
en la validación de producción que exige `COOKIE_SECURE=true`; no se crea una
prueba independiente para cada función o detalle interno.

## Revisión del shell del espacio de trabajo — 2026-10-03

Con la instalación original en `COMPLETED`, un Owner inició sesión y recorrió
`/app/dashboard` y `/app/users`. El panel mostró sidebar compacta, header con
usuario, tema, hora regional y logout. Al enfocar un módulo padre, la sidebar
se expandió y mostró sus hijos; el grupo activo y la ruta hija quedaron
identificados. La pantalla de Usuarios reutilizó el mismo shell sin duplicar
header ni navegación. Las rutas pendientes abrieron su pantalla estructural de
preparación en lugar de producir un enlace roto.

El workflow de CI levanta PostgreSQL, aplica migraciones, ejecuta el seed,
compila la API y ejecuta este smoke test automáticamente.

Resultado verificado localmente:

- Contenedor `geedyx-postgres-1`: `healthy`.
- `pnpm db:migrate:deploy`: cinco migraciones aplicadas correctamente,
  incluida la de configuración y catálogo inicial.
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

## Revisión del flujo de instalación — 2026-10-03

Se creó una base PostgreSQL temporal y aislada, se aplicaron las migraciones y
el seed, y se recorrió la Web desde `PENDING` en el navegador. Las verificaciones
iniciales aparecieron una vez; el envío del formulario creó el Owner, mostró la
transición de acceso y abrió `/login` directamente. El nuevo Owner inició sesión
y llegó a `/app`. Con la instalación original en `COMPLETED`, una visita directa
a `/setup` abrió `/login` sin repetir las verificaciones. También se comprobó
que la caída de la API muestra «No pudimos cargar Geedyx» en `/login` y que
`Reintentar` recupera el formulario al restaurar la API.

La base temporal se eliminó después de la prueba. La base original conservó su
estado `COMPLETED` y la API volvió a conectarse a ella.

Una segunda base aislada permitió revisar el mensaje posterior a la creación:
`/login` mostró «Cuenta creada», el nombre y correo del nuevo Owner y la
instrucción de entrar con ese correo y la contraseña definida. El correo quedó
completado en el formulario. Tras recargar `/login`, el aviso ya no apareció.
La segunda base temporal también se eliminó y se restauró la conexión original.

Una revisión visual posterior confirmó la tarjeta de confirmación separada del
formulario de login. Un `401` esperado al consultar la sesión o rechazar
credenciales no generó `console.error`; un fallo real de conexión mostró el
mensaje de carga y dejó una advertencia en la consola. La base aislada usada
para esta revisión se eliminó y se restauró la instalación original.

## Revisión de usuarios — 2026-10-03

En el navegador, un Owner abrió `/app/users`, consultó el listado y creó una
cuenta de prueba. La interfaz mostró la cuenta como activa, indicó que el
primer acceso estaba pendiente y presentó la contraseña temporal junto con su
vencimiento. En una pestaña aislada, el primer login redirigió a
`/app/password`; después de guardar una contraseña definitiva, el usuario
llegó a `/app` y la sesión mostró el requisito de cambio resuelto. El usuario
de prueba y sus sesiones se eliminaron al terminar.

## Revisión administrativa y catálogo — 2026-10-03

Con la instalación existente y la cuenta `admin@geedyx.test`, se recorrieron en
la Web el Panel con alerta de configuración pendiente, Empresa, Productos,
Categorías, Roles y permisos, Sesiones activas y Registro de auditoría. La API
respondió correctamente en un smoke no destructivo para login, roles de sistema,
configuración, creación de categoría, creación de producto, auditoría y
sesiones.

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

## Preferencias y paginación — 2026-10-03

La validación automatizada del monorepo (`pnpm validate`) pasó en formato, lint,
typecheck, 8 pruebas dirigidas y builds de API y Web. Las pruebas nuevas cubren
la persistencia de preferencias, la herencia desde la empresa, la auditoría del
cambio y el rechazo de una zona horaria inválida.

La prueba de integración `pnpm api:smoke` se intentó ejecutar, pero el entorno
actual no tenía la API escuchando y no fue posible levantar PostgreSQL porque
Docker no está disponible en esta sesión. Queda pendiente repetir el smoke con
PostgreSQL activo para confirmar en runtime las rutas de preferencias y los
parámetros de paginación.
