# Geedyx — Stack técnico inicial

## 1. Propósito

Este documento registra las decisiones técnicas transversales iniciales de Geedyx. No sustituye la documentación funcional de los módulos.

## 2. Tecnologías principales

- **Web:** Next.js.
- **API:** NestJS.
- **Base de datos:** PostgreSQL.
- **Repositorio:** monorepo.

Las versiones se seleccionarán al iniciar la implementación utilizando versiones estables, soportadas y compatibles entre sí. Antes de fijarlas se revisarán los avisos de seguridad y vulnerabilidades conocidas de cada dependencia. Los números concretos quedarán fijados en los archivos de dependencias y lockfile del proyecto.

No se asumirá que una versión está completamente libre de vulnerabilidades para siempre; se mantendrá un proceso de actualización y revisión de dependencias.

## 3. Monorepo

El monorepo deberá permitir trabajar con la aplicación web, la API y la base de datos desde un mismo proyecto, manteniendo separación clara de responsabilidades.

Como organización inicial se consideran:

```text
apps/
├── web/      # aplicación Next.js
└── api/      # aplicación NestJS

packages/     # código compartido cuando sea necesario
database/     # migraciones, semillas y utilidades de base de datos
```

La estructura exacta podrá ajustarse al seleccionar las herramientas del monorepo.

## 4. Scripts de desarrollo

El proyecto deberá ofrecer comandos para:

- Iniciar únicamente la aplicación web.
- Iniciar únicamente la API.
- Iniciar web y API de forma conjunta.
- Ejecutar validaciones, pruebas y compilaciones.

Los nombres definitivos de los scripts se establecerán al crear el proyecto.

## 5. Utilidades de PostgreSQL

Se contemplan comandos para las operaciones frecuentes de desarrollo:

- `reset`: restablecer la base de datos en un entorno permitido.
- `generate`: generar artefactos del acceso a datos cuando corresponda.
- `status`: consultar el estado de la base de datos y/o migraciones.
- Migrar la base de datos.
- Ejecutar semillas de datos iniciales cuando sean necesarias.

Las operaciones destructivas, especialmente `reset`, deberán requerir un entorno explícito o una protección equivalente para evitar ejecutarlas accidentalmente contra datos reales.

## 6. Principios técnicos iniciales

- Web y API mantienen responsabilidades separadas.
- La API es la autoridad para autenticación, autorización y validación de negocio.
- La interfaz nunca sustituye las validaciones del servidor.
- Los instantes persistidos se conservan en UTC; los períodos operativos se
  calculan con la zona horaria global del negocio.
- Las dependencias se mantienen fijadas mediante lockfile.
- Las actualizaciones de seguridad deben poder aplicarse sin rediseñar los módulos.
- El stack no implica construir una infraestructura compleja; describe la aplicación y su entorno de desarrollo.

## 7. Contrato global de la API

La API HTTP utilizará un prefijo global versionado:

```text
/api/v1
```

Los recursos funcionales utilizarán rutas como:

```text
/api/v1/products
/api/v1/inventory
/api/v1/sales
/api/v1/customers
/api/v1/reports
```

No se agregará un namespace redundante como `gdx` en cada ruta.

Las respuestas exitosas utilizarán el código HTTP y un cuerpo con `data`. No
se enviará un campo redundante `success: true` ni un `error: null`:

```json
{
  "data": {
    "id": "sale_123",
    "status": "COMPLETED"
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

Las respuestas de error utilizarán Problem Details con
`application/problem+json` y un código estable para el frontend:

```json
{
  "type": "https://api.geedyx.com/problems/validation-error",
  "title": "Los datos no son válidos",
  "status": 422,
  "detail": "Revisa los campos enviados.",
  "code": "VALIDATION_ERROR",
  "requestId": "req_abc123",
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Introduce un correo válido."
    }
  ]
}
```

El campo `instance` de Problem Details identifica el recurso o endpoint
afectado. `requestId` identifica la solicitud y sirve para soporte y logs.
Nunca se envían stack traces, secretos ni detalles internos.

Códigos HTTP iniciales:

- `200`: consulta o actualización exitosa.
- `201`: recurso creado.
- `204`: operación exitosa sin contenido.
- `400`: solicitud mal formada.
- `401`: usuario no autenticado.
- `403`: usuario sin permiso.
- `404`: recurso inexistente.
- `409`: conflicto de estado, duplicado o idempotencia incompatible.
- `422`: datos sintácticamente válidos, pero inválidos para la operación.
- `429`: demasiadas solicitudes.
- `500`: error inesperado.
- `503`: dependencia o servicio no disponible.

NestJS podrá utilizar sus excepciones internamente, pero un filtro global debe
transformarlas a este contrato. El frontend puede normalizar internamente los
resultados a `{ data, error }`; esa normalización no obliga al backend a enviar
ambos campos en cada respuesta.

El contrato aplica a Instalación, Autenticación, Usuarios y a todos los
módulos funcionales presentes y futuros.

## 8. Health y readiness

Geedyx debe exponer comprobaciones técnicas separadas del API funcional para que la aplicación, el entorno de ejecución y el flujo de instalación puedan conocer su estado.

Endpoints conceptuales:

```text
/health/live
/health/ready
```

`/health/live` indica que el proceso de la API está ejecutándose. No debe depender de que la base de datos esté disponible.

`/health/ready` indica que la API puede atender operaciones funcionales. Puede comprobar, según corresponda:

- Disponibilidad de la base de datos.
- Migraciones requeridas.
- Dependencias necesarias para operar.
- Componentes obligatorios del entorno.

Respuestas iniciales:

- `200`: el estado solicitado es correcto.
- `503`: el proceso está vivo, pero no está listo o una dependencia no está disponible.

Las respuestas externas deben ser seguras y no revelar secretos, cadenas de conexión, stack traces ni detalles internos innecesarios. Los diagnósticos completos pertenecen a los logs técnicos.

El frontend de instalación puede utilizar `/api/v1/setup/status` para mostrar un resumen legible al usuario. Ese endpoint puede consultar internamente readiness y traducir sus resultados a mensajes no técnicos.

Los endpoints de health no forman parte de los recursos funcionales versionados como `/api/v1/products` o `/api/v1/sales`, porque son capacidades técnicas estables para operación y despliegue.

## 9. Idempotencia y reintentos

Las operaciones que cambian datos deben diseñarse considerando reintentos por pérdida de conexión, doble clic o repetición de una solicitud. La idempotencia se aplicará donde repetir la misma intención no deba producir un efecto duplicado.

### Operaciones que requieren protección fuerte

- Instalación y creación del primer Owner.
- Creación y confirmación de ventas.
- Confirmación de pagos.
- Cancelaciones y devoluciones.
- Movimientos de inventario.
- Vinculación de una cuenta pública con un cliente existente.
- Registro de eventos de auditoría derivados de una operación.

### Estrategia inicial

- Las solicitudes de comandos podrán recibir un header `Idempotency-Key`.
- El servidor asociará la clave con el actor, la operación y una huella de la solicitud.
- Una repetición con la misma clave e intención devolverá el resultado original sin repetir efectos.
- Reutilizar una clave con una solicitud diferente debe rechazarse.
- Las restricciones únicas, transacciones y estados de dominio complementan la idempotencia; no se sustituyen entre sí.
- Las operaciones de lectura (`GET`) no requieren claves de idempotencia.
- Las operaciones administrativas manuales que representan acciones distintas deben generar claves distintas, aunque tengan los mismos datos.

No todas las solicitudes `POST` necesitan una infraestructura especial desde el primer día. La implementación debe priorizar las operaciones de dinero, existencias, instalación, cuentas y auditoría.

## 10. Pendientes técnicos

- Gestor de paquetes.
- Herramienta de monorepo.
- ORM o herramienta de acceso a PostgreSQL.
- Estrategia de migraciones y semillas.
- Convenciones de nombres para scripts.
- Versiones exactas de Next.js, NestJS, Node.js y PostgreSQL.
- Estrategia de pruebas.
- Revisión automatizada de dependencias y vulnerabilidades.
