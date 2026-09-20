# Geedyx — Ventas, comprobantes y pagos

## 1. Propósito y alcance

Este documento define el alcance inicial de las ventas internas de Geedyx, el registro de pagos y la generación de un comprobante de venta preparado para evolucionar a una factura fiscal.

La primera versión permitirá que un usuario interno autorizado seleccione o
cree un cliente, o continúe la venta como consumidor final, agregue productos o
variantes, aplique precios y descuentos, registre efectivo o transferencia,
confirme la operación y actualice el inventario.

Cuando se selecciona un cliente, el servidor debe validar que se encuentre en
estado `ACTIVE`. Un cliente `BLOCKED` no puede asociarse a una nueva venta ni
completar una venta pendiente.

La tienda pública, el carrito, las cuentas de clientes externos y los pedidos desde un dominio público quedan preparados conceptualmente, pero son una extensión futura y opcional.

## 2. Separación de responsabilidades

```text
Clientes y proveedores
    identifica al cliente y conserva su historial

Productos y catálogo
    define productos, variantes, precios base y descuentos permitidos

Ventas
    registra la operación, sus líneas, pagos y comprobante

Inventario
    registra las entradas o salidas de existencias

Configuración general
    define la moneda principal configurada
```

Ventas no administra productos, inventario, compras, caja, bancos ni reglas fiscales avanzadas.

## 3. Actores

- Owner: puede realizar y administrar ventas según su control total.
- Admin: puede realizar operaciones según sus permisos.
- Usuario autorizado: puede crear o confirmar ventas si tiene los permisos funcionales correspondientes.
- Cliente: puede ser asociado a la venta, pero no accede a `/app`.

## 4. Venta y líneas

Una venta debe conservar, como mínimo:

- Identificador interno.
- Número consecutivo del comprobante.
- Cliente asociado, cuando se registra; puede quedar vacío para consumidor final.
- Usuario que registró la operación.
- Estado de la venta.
- Moneda de la operación.
- Subtotal.
- Descuento total.
- Impuestos reservados para una fase futura.
- Total.
- Fecha y hora.
- Referencia al pago.

Cada línea de venta debe conservar una copia histórica de:

- Producto.
- Variante seleccionada.
- SKU.
- Nombre comercial.
- Cantidad.
- Precio unitario aplicado.
- Descuento aplicado.
- Total de la línea.

Los datos históricos de la venta no deben cambiar si posteriormente se modifica el producto, la variante o su precio.

## 5. Estados de la venta

Estados iniciales:

- `DRAFT`: venta en preparación.
- `PENDING_PAYMENT`: venta registrada, pero esperando confirmación del pago.
- `COMPLETED`: pago confirmado y venta completada.
- `CANCELLED`: venta cancelada antes de completarse, según autorización.
- `RETURNED`: venta completada con devolución total registrada.

Una venta en `DRAFT` no afecta el inventario. Una transferencia pendiente tampoco genera inicialmente una salida definitiva de inventario. La política de reserva para pedidos públicos se definirá cuando se implemente la tienda pública.

## 6. Pagos iniciales

La primera versión manejará únicamente:

- `CASH`: efectivo.
- `BANK_TRANSFER`: transferencia.

Estados del pago:

- `PENDING`: pago todavía no confirmado.
- `CONFIRMED`: pago validado.
- `CANCELLED`: pago invalidado.
- `REFUNDED`: pago devuelto.

Una venta podrá tener inicialmente un registro de pago principal. La estructura debe permitir ampliar el modelo en el futuro si se requieren pagos parciales o múltiples métodos.

En la primera versión, la venta debe quedar completamente cubierta para pasar
a `COMPLETED`:

- No se permiten pagos parciales.
- No se permiten varios métodos de pago en una misma venta.
- El monto aplicado a la venta debe coincidir con el total final.
- Un monto menor deja la venta pendiente y no genera una salida de inventario.

El total de la venta y los montos recibidos deben conservar la precisión
monetaria definida para la moneda principal. Las validaciones se realizan en
el servidor.

### Efectivo

El efectivo puede marcarse como confirmado al registrar la venta si el usuario
autorizado recibe un monto igual o superior al total.

Cuando el monto recibido supera el total, Geedyx calcula y conserva el cambio:

```text
monto aplicado = total de la venta
cambio = monto recibido - total de la venta
```

El comprobante y los reportes deben distinguir el monto recibido, el monto
aplicado y el cambio entregado.

### Transferencia

La transferencia puede registrarse como pendiente. Un Owner, Admin o usuario con permiso debe confirmar manualmente:

- Monto recibido.
- Fecha de confirmación.
- Usuario que confirmó.
- Referencia de transferencia opcional.
- Observación opcional.

El monto confirmado por transferencia debe coincidir exactamente con el total
de la venta. Si es menor o mayor, la transferencia no se confirma
automáticamente y la venta permanece pendiente hasta corregirla o revisarla.

Al confirmar el pago, la venta pasa a `COMPLETED` y se registra la salida de inventario.

## 7. Precios, descuentos y moneda

- La moneda de la venta se toma de la moneda principal definida en Configuración general.
- La venta conserva el código de moneda utilizado.
- No se permite multimoneda dentro de la primera versión.
- El precio proviene de la variante seleccionada.
- Cada variante activa tiene su propio precio; no existe herencia de precios
  desde el producto base.
- Se permite un descuento por variante, expresado como porcentaje o monto fijo.
- Una variante no puede aplicar simultáneamente descuento porcentual y fijo.
- No se incluyen listas de precios, cupones, descuentos por volumen, precios por cliente ni promociones complejas.

La venta conserva los valores aplicados para que sus totales no cambien posteriormente.

## 8. Comprobante de venta

La primera versión generará un comprobante de venta operativo, no una factura fiscal integrada con autoridades tributarias.

El comprobante debe conservar:

- Número consecutivo.
- Tipo de documento.
- Fecha y hora.
- Datos del negocio.
- Datos del cliente usados en la operación.
- Líneas de productos y variantes.
- Subtotal.
- Descuento.
- Impuestos reservados para una fase posterior.
- Total.
- Moneda.
- Método y estado del pago.

La fecha y hora del comprobante se calculan con la zona horaria global del
negocio. El instante persistido conserva una referencia consistente y no se
modifica por la zona horaria personal de quien consulte la venta.

El tipo de documento debe permitir una evolución futura:

```text
SALES_RECEIPT
FISCAL_INVOICE
CREDIT_NOTE
DEBIT_NOTE
```

El documento inicial no debe presentarse como fiscal si todavía no se han implementado las reglas tributarias correspondientes.

Las ventas confirmadas no se eliminan ni se editan silenciosamente. Una corrección se registra mediante cancelación, devolución o documento inverso cuando corresponda.

## 9. Flujo de venta interna

```text
Usuario autorizado inicia venta
    ↓
Selecciona o crea cliente, o continúa como consumidor final
    ↓
Selecciona productos o variantes
    ↓
Calcula subtotal, descuentos y total
    ↓
Selecciona efectivo o transferencia
    ↓
Confirma el pago si el total está cubierto o deja la venta pendiente
    ↓
Completa la venta cuando corresponda
    ↓
Genera comprobante
    ↓
Registra movimiento SALE en Inventario
    ↓
Registra auditoría
```

La creación de la venta, el pago confirmado, el comprobante y el movimiento de inventario deben mantener consistencia transaccional. Un fallo no debe dejar una venta completada sin su movimiento de inventario correspondiente.

La creación, confirmación de pago, cancelación y devolución deben ser idempotentes frente a reintentos. Una misma intención repetida debe devolver el resultado ya confirmado sin crear una segunda venta, pago, comprobante o movimiento de inventario.

## 10. Cancelaciones y devoluciones

- Una venta en `DRAFT` o `PENDING_PAYMENT` puede cancelarse con un motivo.
- Cancelar una venta pendiente no modifica el inventario.
- Una venta `COMPLETED` no se cancela; se procesa mediante una devolución.
- En la primera versión solo se permiten devoluciones totales de ventas
  completadas.
- Una devolución requiere autorización y debe conservar motivo, fecha, usuario
  y productos involucrados.
- La devolución registra manualmente el reembolso del total aplicado y cambia
  el pago a `REFUNDED`.
- La devolución aprobada genera un movimiento `RETURN` en Inventario y cambia
  la venta a `RETURNED`.
- El comprobante original permanece disponible y no se elimina.
- Las operaciones originales permanecen disponibles para auditoría.

Las devoluciones parciales, los reembolsos parciales, los productos dañados o
no revendibles y las reglas de reposición diferenciadas se ampliarán en una
fase posterior.

## 11. Registro financiero y reportes

La primera versión registrará información operativa suficiente para consultar:

- Cantidad de ventas.
- Total vendido.
- Ventas por período.
- Ventas por método de pago.
- Ventas por producto o variante.
- Ventas por cliente.
- Descuentos aplicados.
- Ventas canceladas o devueltas.
- Pagos pendientes y confirmados.

Esto no constituye contabilidad de partida doble, Caja y bancos ni conciliación bancaria.

No se calculará utilidad real mientras no exista un modelo de costos y valoración de inventario.

## 12. Presentación en la interfaz

La interfaz debe ofrecer, como mínimo:

- Lista de ventas en tabla o cartas según el contexto.
- Búsqueda y filtros por fecha, cliente, estado y método de pago.
- Formulario de venta con selección de cliente y variantes.
- Resumen visible de subtotal, descuentos, total, moneda y pago.
- Estados de carga, error, éxito y pendiente.
- Detalle de la venta y su comprobante.
- Menú compacto para acciones autorizadas.
- Confirmaciones para cancelaciones, devoluciones y confirmación de transferencias.

La interfaz debe utilizar los patrones, tokens, estados y controles definidos en `UI-FRONTEND.md`.

## 13. Auditoría y permisos

El módulo debe emitir eventos como:

- Creación de venta.
- Modificación de una venta en borrador.
- Registro de pago.
- Confirmación de transferencia.
- Confirmación de venta.
- Cancelación.
- Devolución.
- Generación o consulta del comprobante cuando sea relevante.

Permisos iniciales del módulo:

- `sales.read`: consultar ventas y comprobantes.
- `sales.create`: crear ventas y registrar pagos en efectivo.
- `sales.cancel`: cancelar ventas en `DRAFT` o `PENDING_PAYMENT`.
- `sales.return`: autorizar devoluciones de ventas completadas.
- `payments.read`: consultar pagos.
- `payments.confirm`: confirmar transferencias.

No se utiliza `delete`; las ventas se cancelan o devuelven y los pagos se
cancelan o reembolsan según corresponda.

Nunca se registran contraseñas, tokens ni secretos de pago.

## 14. Fuera del alcance inicial

- Pasarelas de pago.
- Tienda pública y carrito.
- Cuentas de clientes externos.
- Compras.
- Caja y bancos.
- Conciliación bancaria.
- Contabilidad de partida doble.
- Crédito y cuotas.
- Devoluciones parciales y reembolsos parciales.
- Gestión de productos devueltos no revendibles.
- Multimoneda.
- Impuestos y reglas fiscales avanzadas.
- Listas de precios.
- Promociones complejas.
- Envíos y logística.
- Costos y utilidad avanzada.
