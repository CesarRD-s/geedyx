# Geedyx — Clientes y proveedores

## 1. Propósito y alcance

Este documento define el alcance inicial de los clientes del negocio y los proveedores registrados en Geedyx.

El cliente de este documento es la persona que compra productos al negocio que utiliza Geedyx. No representa al negocio que utiliza Geedyx como producto SaaS, porque la primera versión funciona como un sistema para un solo negocio y no incluye organizaciones ni tenants.

Los clientes y proveedores son registros comerciales. No tienen acceso al panel interno de Geedyx.

## 2. Separación de responsabilidades

```text
Usuario interno
    accede a /app y opera el sistema

Cliente del negocio
    compra al negocio y puede tener una cuenta futura de tienda

Proveedor
    se registra para recepción o compras
```

`AUTH-USERS.md` administra usuarios internos, sesiones, roles y permisos. Un cliente externo no recibe los roles `Owner`, `Admin` ni `User` del sistema interno.

## 3. Cliente del negocio

Un cliente puede registrarse desde una venta interna aunque no tenga una cuenta de acceso público.

Datos iniciales:

- Nombre completo.
- Correo electrónico opcional; único cuando se proporciona.
- Teléfono opcional.
- Dirección principal opcional.
- Estado básico.
- Cuenta de tienda opcional.

Cuando se proporciona, el correo debe normalizarse antes de validar su
unicidad. No se exigirán inicialmente identificación legal, datos fiscales,
clasificación de persona o empresa ni información comercial avanzada.

Estados iniciales del cliente:

- `ACTIVE`: puede utilizarse en operaciones comerciales.
- `BLOCKED`: no puede asociarse a nuevas operaciones comerciales.

Un cliente puede bloquearse manualmente con el permiso `customers.manage`. El
motivo es obligatorio y la acción debe quedar auditada. El bloqueo conserva los
datos, las ventas y el historial del cliente.

Mientras esté bloqueado:

- No puede asociarse a nuevas ventas.
- No puede completar una venta pendiente asociada a él.
- No puede iniciar pedidos nuevos en una futura tienda pública.
- Sus ventas anteriores siguen disponibles para consulta.
- Puede participar en devoluciones o reembolsos de operaciones anteriores.

Una venta pendiente asociada a un cliente bloqueado puede cambiarse a otro
cliente activo, continuar como consumidor final o cancelarse. El desbloqueo
requiere `customers.manage` y también queda registrado en auditoría.

El bloqueo es siempre manual en la primera versión. No se activa
automáticamente por pagos pendientes, porque el sistema no incluye crédito ni
cuentas por cobrar.

## 4. Cuenta pública opcional

Una cuenta pública no es necesaria para crear el registro comercial del cliente.

La relación conceptual es:

```text
Customer
├── historial de ventas y pedidos
├── datos de contacto
├── dirección
└── CustomerAccount opcional
```

Si en el futuro el negocio activa una tienda en línea:

- El cliente podrá consultar el catálogo sin autenticarse.
- Podrá agregar productos al carrito sin autenticarse.
- Deberá autenticarse al procesar la compra.
- Podrá consultar sus propios pedidos e historial permitido.
- Solo tendrá acceso al dominio público de la tienda.
- No tendrá acceso a `/app` ni a las funciones administrativas.

La cuenta pública utilizará la infraestructura de autenticación y sesiones definida por Geedyx, pero tendrá un alcance separado de los usuarios internos.

Para una cuenta pública, el correo será obligatorio y funcionará como el
identificador único de acceso. El correo debe verificarse mediante un flujo que
demuestre que la persona lo controla.

## 5. Vinculación con un cliente existente

Si una persona realiza primero una compra interna y posteriormente se registra en la tienda pública con el mismo correo:

1. Geedyx normaliza el correo.
2. Busca el `Customer` existente.
3. Crea o vincula un `CustomerAccount`.
4. Conserva el historial existente.
5. No crea un segundo registro de cliente.

Si la compra interna no tenía correo, el registro no se vincula
automáticamente por nombre o teléfono. La vinculación posterior requerirá un
flujo seguro de verificación o una acción administrativa autorizada.

La vinculación pública debe requerir un mecanismo para demostrar que la persona controla el correo, como verificación, invitación o activación segura. No se debe asociar una cuenta únicamente por conocer un correo registrado.

Si el cliente cambia su correo, las ventas y pedidos históricos permanecen relacionados mediante el identificador interno del cliente, no por el texto del correo.

## 6. Proveedor

El proveedor es opcional y no requiere cuenta de acceso.

Datos iniciales:

- Nombre o razón comercial.
- Persona de contacto opcional.
- Correo y teléfono opcionales.
- Dirección opcional.
- Identificación legal o fiscal opcional.
- Estado.
- Notas internas.

Estados iniciales del proveedor:

- `ACTIVE`: puede seleccionarse en recepciones o compras.
- `INACTIVE`: se conserva el historial, pero no se selecciona en nuevas operaciones sin autorización.

No se obliga a registrar un proveedor para recibir productos. Una recepción puede existir sin proveedor.

## 7. Direcciones y datos de contacto

En la primera versión se contempla una dirección principal opcional por cliente y proveedor.

Cuando se cree un pedido con envío, la dirección y los datos de contacto usados en ese pedido deben copiarse dentro del pedido. De esta forma, los cambios posteriores del cliente no modifican operaciones históricas.

La administración de múltiples direcciones, contactos adicionales, direcciones de facturación y reglas de entrega queda para una fase posterior junto con Ventas y pedidos.

## 8. Relación con otros módulos

```text
Clientes y proveedores
    define registros comerciales

Productos
    define productos y variantes

Ventas y pedidos
    usa clientes, productos y estados de operación

Inventario
    registra movimientos originados por ventas o recepciones

Compras
    podrá usar proveedores y recepciones
```

Clientes y proveedores no administran carritos, pedidos, pagos, facturación ni movimientos de inventario.

## 9. Operaciones principales

### Venta interna

```text
Usuario autorizado puede buscar o crear cliente
    ↓
Si no se identifica cliente, la venta continúa como consumidor final
    ↓
Selecciona productos o variantes
    ↓
Ventas registra la operación
    ↓
Inventario registra los movimientos correspondientes
```

### Compra futura desde la tienda pública

```text
Cliente consulta catálogo sin autenticarse
    ↓
Agrega productos al carrito
    ↓
Inicia sesión al confirmar la compra
    ↓
Se relaciona el pedido con Customer
    ↓
Cliente consulta el estado de su pedido
```

Los estados de pedido y pago pertenecen al módulo de Ventas y pedidos.

### Recepción con proveedor

```text
Usuario autorizado registra recepción
    ↓
Selecciona proveedor, si existe
    ↓
Verifica productos y cantidades
    ↓
Inventario confirma la entrada
```

## 10. Auditoría y permisos

El módulo debe emitir eventos relevantes como:

- Creación, edición, bloqueo o desbloqueo de un cliente.
- Creación, edición o inactivación de un proveedor.
- Vinculación de una cuenta pública con un cliente existente.
- Cambio de correo o datos sensibles del cliente.
- Uso de un cliente o proveedor en una operación relevante.

Owner y Admin podrán administrar estos registros según los permisos funcionales definidos para el módulo. Los usuarios operativos solo podrán crear, consultar o modificar clientes y proveedores si tienen autorización.

Permisos iniciales del módulo:

- `customers.read`: consultar clientes.
- `customers.manage`: crear, editar, bloquear y desbloquear clientes.
- `suppliers.read`: consultar proveedores.
- `suppliers.manage`: crear, editar e inactivar proveedores.

No se utiliza `delete`; los registros se bloquean o inactivan para conservar
el historial de operaciones.

No se registran contraseñas, tokens ni secretos de cuentas públicas.

## 11. Fuera del alcance inicial

- Acceso de clientes al panel interno.
- Portal de proveedores.
- CRM.
- Programa de fidelidad.
- Crédito, saldos o cuentas por cobrar.
- Marketing y segmentación avanzada.
- Múltiples direcciones y contactos complejos.
- Integraciones externas.
- Identificación fiscal obligatoria del cliente.
- Registro obligatorio de proveedores.
- Sitio público de ecommerce dentro de la primera versión de Geedyx.
