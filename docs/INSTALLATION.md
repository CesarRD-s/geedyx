# Geedyx — Instalación inicial

## 1. Propósito y alcance

Este documento define el flujo funcional para preparar una instalación nueva de Geedyx y crear su primer usuario `Owner`.

La instalación inicial prepara el sistema para un solo negocio. No configura organizaciones, tenants, sucursales, catálogos, clientes, pedidos ni módulos de negocio. Tampoco sustituye la configuración técnica del entorno ni la configuración general que el Owner podrá completar después de acceder al sistema.

La instalación se considera completada cuando el primer Owner se crea correctamente. A partir de ese momento, el setup queda bloqueado y no puede utilizarse nuevamente.

## 2. Estado de la instalación

El sistema debe conservar un único registro de instalación con, como mínimo:

- Estado de instalación.
- Fecha y hora de inicio.
- Fecha y hora de finalización, cuando corresponda.
- Identificador del usuario Owner creado, cuando corresponda.

Los estados persistidos son:

- `PENDING`: el sistema todavía no tiene Owner y la instalación puede continuar.
- `COMPLETED`: el Owner fue creado y la instalación quedó bloqueada.

Los estados visuales como `checking`, `retrying` o `creating` pertenecen a la interfaz y no representan estados persistidos adicionales.

Las invariantes principales son:

- `PENDING` no puede tener un Owner de instalación confirmado.
- `COMPLETED` debe tener un Owner creado correctamente.
- Una instalación `COMPLETED` no puede volver a ejecutar el setup.

## 3. Flujo funcional

### 3.1 Detección de una instalación nueva

Cuando Geedyx se inicia, el servidor determina si la instalación está pendiente. Mientras no exista un Owner, no se permite el acceso normal al login, Panel operativo ni módulos.

### 3.2 Preparación del sistema

La pantalla pública de setup presenta una lista de verificaciones expresadas en lenguaje no técnico:

- Componentes necesarios disponibles.
- Servicio de Geedyx disponible.
- Base de datos disponible.

Estas verificaciones pueden apoyarse en las capacidades técnicas de health y readiness definidas en `TECH-STACK.md`. El flujo de instalación no debe exponer directamente los detalles técnicos de esos endpoints; debe presentar un resumen comprensible y una referencia para soporte.

La verificación de componentes puede incluir las dependencias requeridas para ejecutar la aplicación. Los detalles técnicos permanecen en los logs del servidor; la interfaz muestra un mensaje claro y una referencia que el Owner puede compartir con el desarrollador.

Si una verificación falla:

- La instalación permanece en `PENDING`.
- No se crea ningún usuario.
- Se muestra el problema de forma comprensible.
- Se permite reintentar desde el inicio del flujo.

### 3.3 Creación del Owner

Cuando todas las verificaciones están correctas, se muestra un formulario simple con:

- Nombre visible del Owner.
- Correo electrónico.
- Contraseña.
- Confirmación de contraseña.

El correo electrónico es el identificador único de acceso, conforme a `AUTH-USERS.md`. No se utiliza un nombre de usuario adicional para iniciar sesión.

El Owner define su contraseña definitiva durante la instalación. No se utiliza contraseña temporal ni se requiere proveedor de correo para completar este flujo.

### 3.4 Finalización y login

La creación del Owner, la asignación del rol `Owner` y el cambio del estado de instalación a `COMPLETED` deben confirmarse en una única transacción.

Cuando la operación termina correctamente:

1. Se registra la creación del Owner.
2. Se registra la finalización de la instalación.
3. Se bloquean el setup y sus operaciones de escritura.
4. El usuario es redirigido al login.
5. El usuario inicia sesión manualmente con sus credenciales.

La instalación no inicia automáticamente una sesión del Owner.

## 4. Interrupciones y reintentos

El frontend puede volver visualmente al inicio si la operación falla, pero el servidor siempre es la fuente de verdad.

- Las verificaciones de preparación deben poder repetirse sin efectos secundarios.
- Si una verificación falla, no se modifica el estado a `COMPLETED`.
- Si falla la creación del Owner, la transacción debe revertirse y la instalación permanece en `PENDING`.
- Si el navegador pierde la respuesta después de una creación exitosa, el siguiente intento detecta que la instalación ya fue completada y no crea otro Owner.
- Dos solicitudes simultáneas no pueden crear dos Owners.

La protección inicial contra duplicados se basa en:

- Restricción única para el correo.
- Transacción de creación del Owner y finalización de instalación.
- Validación del estado de instalación en el servidor.
- Restricción de una sola cuenta con rol `Owner` durante la preparación inicial.
- Idempotencia de la solicitud de creación cuando se reintenta por pérdida de respuesta.

La restricción de un solo Owner aplica únicamente a la preparación inicial. La
creación de Owners adicionales se realiza posteriormente desde Usuarios y solo
puede autorizarla un Owner activo.

La instalación utilizará la estrategia transversal de idempotencia cuando esté disponible; no requiere un mecanismo distinto o específico para este flujo.

## 5. Rutas de interfaz y API

Las rutas de interfaz se separan de la aplicación autenticada:

```text
/setup              pública mientras la instalación está pendiente
/login              pública después de completar la instalación
/app/dashboard      protegida
/app/...             protegidas
```

Mientras la instalación esté pendiente, `/login` debe redirigir a `/setup`. Cuando la instalación esté completada, `/setup` debe redirigir a `/login`.

La API utiliza el prefijo global versionado `/api/v1` y no añade un namespace de producto redundante como `gdx`:

```text
GET  /api/v1/setup/status
POST /api/v1/setup/owner
```

La API debe validar el estado de instalación aunque la interfaz ya haya aplicado las redirecciones.

## 6. Requests y responses

Las respuestas exitosas no necesitan un campo redundante `success: true`. El resultado se expresa mediante el código HTTP y un cuerpo tipado cuando corresponda:

```json
{
  "data": {
    "installationStatus": "PENDING",
    "ready": true
  },
  "meta": {
    "requestId": "req-7f3k2"
  }
}
```

Los errores deben utilizar un formato uniforme basado en Problem Details para HTTP APIs (`application/problem+json`), con un código estable para el frontend:

```json
{
  "type": "https://api.geedyx.com/problems/database-unavailable",
  "title": "La base de datos no está disponible",
  "status": 503,
  "detail": "No se puede continuar con la preparación de Geedyx.",
  "instance": "/api/v1/setup/status",
  "code": "DATABASE_UNAVAILABLE",
  "requestId": "req-7f3k2"
}
```

El cliente del frontend puede normalizar estos resultados a un tipo con `data` o `error`, donde `error` sea un objeto o `null`. No debe depender de interpretar mensajes humanos.

Respuestas principales:

- `200`: consulta de estado correcta.
- `201`: Owner creado y setup completado.
- `409`: la instalación ya fue completada o existe un conflicto de creación.
- `422`: datos del formulario inválidos.
- `503`: un componente necesario no está disponible.
- `500`: fallo inesperado sin detalles técnicos expuestos al usuario.

## 7. Auditoría y logs

El flujo debe emitir eventos mínimos de auditoría:

- `SETUP_STARTED`.
- `SETUP_CHECK_FAILED`.
- `OWNER_CREATED`.
- `OWNER_CREATION_FAILED`.
- `INSTALLATION_COMPLETED`.

Cada evento debe conservar, cuando esté disponible:

- Actor.
- Acción o evento.
- Fecha y hora.
- Resultado.
- Módulo de origen.
- Entidad afectada.
- Identificador de correlación o referencia.
- Detalle suficiente sin exponer información sensible.

No se registran contraseñas, tokens, secretos ni credenciales. Si la base de datos no está disponible, el fallo solo puede quedar temporalmente en los logs técnicos del servidor; no se debe simular un registro de auditoría persistente inexistente.

## 8. Seguridad y límites

- El formulario del Owner se valida en el servidor.
- El correo se normaliza y se valida con la misma regla definida para usuarios.
- El endpoint de creación solo funciona mientras la instalación esté en `PENDING`.
- La URL no es el mecanismo de seguridad; el servidor debe imponer el estado de instalación.
- La instalación no puede reabrirse mediante una ruta pública después de quedar `COMPLETED`.
- El setup no configura módulos, clientes, productos, pedidos, catálogo público ni catálogo interno.

## 9. Fuera del alcance inicial

- Reinstalación desde la aplicación.
- Restablecimiento administrativo de la instalación.
- Proveedores de correo, OTP o recuperación durante el setup.
- Instalación multi-tenant u organizaciones.
- Configuración general de la empresa dentro del wizard.
- Creación de usuarios adicionales.
- Catálogo, ventas, compras, inventario o pedidos.
