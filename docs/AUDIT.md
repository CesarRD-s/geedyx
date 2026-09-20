# Geedyx — Auditoría transversal

## 1. Propósito y alcance

La auditoría es una capacidad transversal de Geedyx. Conserva evidencia de eventos relevantes de seguridad, administración y operación para facilitar trazabilidad y revisión.

La primera versión será administrativa, de solo lectura y transversal. No es un sistema de logs técnicos, monitoreo de infraestructura ni contabilidad.

## 2. Separación de responsabilidades

Cada módulo emite eventos relacionados con su propio dominio. La capacidad transversal de auditoría valida, almacena y permite consultar esos eventos.

```text
Módulo de origen
    ↓
Emite evento
    ↓
Capacidad transversal de auditoría
    ↓
Registro central inmutable
```

Los módulos no deben duplicar la lógica de consulta ni definir almacenes de auditoría separados.

## 3. Acceso y permisos

- **Owner:** puede consultar todos los eventos.
- **Admin:** puede consultar eventos si tiene el permiso `audit.read`.
- **User:** no puede consultar la auditoría por defecto.
- **Cliente externo:** no tiene acceso a la auditoría.

Los permisos se validan en el servidor. Ningún actor puede editar o eliminar eventos desde la aplicación.

Los usuarios operativos pueden generar eventos como resultado de sus acciones aunque no tengan permiso para consultarlos.

## 4. Eventos iniciales

La primera versión registrará eventos relevantes, no cada lectura o interacción visual.

### Instalación

- `SETUP_STARTED`.
- `SETUP_CHECK_FAILED`.
- `OWNER_CREATED`.
- `OWNER_CREATION_FAILED`.
- `INSTALLATION_COMPLETED`.

### Autenticación y usuarios

- Inicio de sesión exitoso o fallido.
- Cierre, expiración o revocación de sesión.
- Creación, activación, desactivación o bloqueo de usuario.
- Bloqueo automático por intentos fallidos y desbloqueo administrativo.
- Cambio o restablecimiento de contraseña.
- Recuperación aprobada, rechazada o completada.
- Creación o modificación de roles y permisos.
- Creación, promoción, degradación o desactivación de Owners.

### Configuración

- Creación o modificación de valores globales.
- Restauración administrativa de valores predeterminados, si se incorpora.

### Productos y catálogo

- Creación, edición o archivado de productos.
- Creación, edición o eliminación lógica de variantes.
- Cambios de precio o descuento.
- Cambios de SKU o código de barras.
- Publicación, despublicación o cambio de visibilidad.
- Creación, edición o archivado de categorías.

### Clientes y proveedores

- Creación, edición, bloqueo o desbloqueo de clientes.
- Creación, edición o inactivación de proveedores.
- Vinculación de una cuenta pública con un cliente existente, cuando exista tienda pública.
- Cambio de datos sensibles del cliente.

### Inventario

- Carga de existencia inicial.
- Recepción confirmada.
- Venta registrada como salida.
- Devolución confirmada.
- Ajuste de inventario.
- Pérdida o merma registrada.
- Cambio del umbral de stock bajo.

### Ventas y pagos

- Creación o modificación de una venta en borrador.
- Registro de pago.
- Confirmación de transferencia.
- Confirmación de venta.
- Cancelación.
- Devolución.
- Generación o consulta relevante del comprobante.

Cada módulo puede ampliar sus eventos cuando se defina una necesidad funcional concreta.

## 5. Datos mínimos de un evento

Cada evento debe conservar, cuando aplique:

- Identificador único del evento.
- Fecha y hora consistente.
- Actor que ejecutó la acción.
- Módulo de origen.
- Tipo de acción.
- Entidad afectada.
- Identificador de la entidad afectada.
- Resultado: `SUCCESS` o `FAILURE`.
- Referencia o identificador de correlación de la solicitud.
- Detalle seguro y suficiente para comprender el evento.
- Motivo cuando la operación lo requiere.
- Origen técnico, como IP o agente, únicamente cuando aporte trazabilidad y no exponga datos innecesarios.

Cuando la acción sea automática, el actor puede ser `SYSTEM`.

El evento debe permitir responder como mínimo:

```text
Qué ocurrió
Quién lo hizo
Cuándo ocurrió
Sobre qué entidad ocurrió
Cuál fue el resultado
```

Los instantes de auditoría se conservan con una referencia UTC consistente.
Los filtros administrativos por fecha utilizan la zona horaria global del
negocio. La interfaz puede mostrar el timestamp en la zona horaria personal
del usuario como preferencia visual, sin cambiar el instante ni el resultado
del filtro.

## 6. Consulta administrativa

La primera versión debe permitir consultar eventos mediante:

- Tabla responsive.
- Paginación.
- Filtro por rango de fechas.
- Filtro por actor.
- Filtro por módulo.
- Filtro por acción.
- Filtro por resultado.
- Búsqueda por entidad o referencia.
- Vista de detalle mediante panel o drawer.

La interfaz debe contemplar estados de carga, vacío, error y resultado. Las acciones se mostrarán según los permisos del usuario.

La consulta se integrará en la sección administrativa y utilizará los patrones visuales definidos en `UI-FRONTEND.md`.

## 7. Inmutabilidad y protección

- Los eventos se pueden crear y consultar según permisos.
- Los eventos no se editan desde la aplicación.
- Los eventos no se eliminan desde la aplicación.
- Un reintento de la misma operación no debe crear eventos de auditoría duplicados.
- Las acciones de consulta no generan eventos innecesarios de lectura por defecto.
- Los eventos confirmados deben conservar una referencia temporal consistente.
- Los detalles no deben permitir alterar la evidencia original.

No deben almacenarse:

- Contraseñas.
- Tokens completos.
- Secretos.
- Credenciales.
- Datos sensibles que no sean necesarios para la trazabilidad.

## 8. Auditoría y logs técnicos

La auditoría funcional y los logs técnicos cumplen propósitos diferentes:

```text
Auditoría
    registra qué acción funcional ocurrió, quién la ejecutó y cuándo

Logs técnicos
    registran errores internos, diagnósticos y detalles de ejecución
```

Un fallo que ocurre antes de que la base de datos esté disponible puede quedar únicamente en logs técnicos. No se debe simular un evento de auditoría persistente cuando no pudo almacenarse.

## 9. Retención y administración futura

La primera versión no incluirá:

- Configuración de retención por usuario.
- Eliminación manual.
- Archivado automático.
- Exportación avanzada.
- Alertas.
- Detección de anomalías.
- Almacenamiento externo o inmutable fuera del sistema.
- Consultas analíticas complejas.

La retención, protección adicional y exportación podrán definirse en una fase posterior sin cambiar el contrato básico de eventos.
