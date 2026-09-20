# Geedyx — Inventario operativo

## 1. Propósito y alcance

Este documento define el alcance inicial del inventario de Geedyx. El módulo controla las existencias de las variantes de productos y conserva el historial de movimientos que explican cada cambio.

Inventario trabaja sobre los productos y variantes definidos en `PRODUCTS.md`. No administra nombres, descripciones, categorías, precios ni galerías; esos datos pertenecen al módulo de Productos.

La primera versión utilizará un único inventario general para el negocio. No se contemplan sucursales, almacenes múltiples ni estructuras de ubicación complejas.

## 2. Unidad de inventario

El inventario se controla por `ProductVariant`.

```text
Producto: Camisa Oxford
Variante: Azul / M
Existencia: 12 unidades
```

Un producto sin opciones tendrá una variante predeterminada y también podrá administrarse en inventario.

La cantidad se manejará inicialmente como un número entero de unidades. Las cantidades decimales, medidas por peso o volumen quedan fuera del alcance inicial.

## 3. Saldos y disponibilidad

El inventario debe conservar, como mínimo:

- Existencia física actual.
- Existencia reservada, cuando una operación futura la requiera.
- Existencia disponible para venta.
- Umbral de stock bajo.

Inicialmente:

```text
existencia disponible = existencia física - existencia reservada
```

La reserva se integrará con el flujo de pedidos y ventas cuando ese módulo sea definido. Mientras no exista una reserva activa, la existencia disponible será igual a la existencia física.

El umbral de stock bajo se configura para la variante. Puede utilizarse para determinar el estado visible y para futuras alertas.

Estados iniciales de disponibilidad:

- `AVAILABLE`: Disponible.
- `LOW_STOCK`: Pocas unidades.
- `OUT_OF_STOCK`: Agotado.

Reglas:

- Si la existencia disponible es `0`, el estado es `OUT_OF_STOCK`.
- Si es mayor que `0` y es menor o igual al umbral configurado, el estado es `LOW_STOCK`.
- Si es mayor que el umbral, el estado es `AVAILABLE`.

El catálogo público mostrará el texto correspondiente al estado y no la cantidad exacta por defecto. La interfaz interna podrá mostrar las cantidades para usuarios autorizados.

## 4. Movimientos de inventario

La existencia no se edita directamente. Cada cambio debe producir un movimiento trazable.

Tipos iniciales:

- `INITIAL_STOCK`: existencia inicial.
- `RECEIPT`: recepción de productos.
- `SALE`: salida por venta completada.
- `RETURN`: devolución ingresada al inventario.
- `ADJUSTMENT_IN`: ajuste positivo.
- `ADJUSTMENT_OUT`: ajuste negativo.
- `LOSS`: pérdida, daño o merma.

Los movimientos confirmados no se eliminan físicamente. Un error se corrige mediante un movimiento inverso o un ajuste autorizado.

Cada movimiento debe conservar, cuando corresponda:

- Variante afectada.
- Tipo de movimiento.
- Cantidad.
- Fecha y hora.
- Usuario o actor.
- Motivo u observación.
- Referencia de la operación relacionada.
- Existencia resultante.

## 5. Operaciones iniciales

### Existencia inicial

La carga inicial debe generar movimientos `INITIAL_STOCK`. No se permitirá asignar una cantidad inicial sin dejar trazabilidad.

### Recepción

Una recepción puede registrar un proveedor o dejarlo vacío. No se obliga a crear un proveedor ficticio.

La recepción permite verificar los productos y cantidades antes de confirmar la entrada al inventario.

```text
Recepción
    ↓
Verificar variantes y cantidades
    ↓
Confirmar recepción
    ↓
Crear movimiento de entrada
```

### Salida por venta

La venta completada genera un movimiento `SALE`. La validación manual del pago y el momento exacto de la salida están definidos en `SALES.md`; los pedidos públicos quedan para una extensión futura.

### Devolución

En la primera versión, una devolución aprobada corresponde a la devolución
total de una venta completada. Las unidades se consideran aptas para regresar
al inventario y generan un movimiento `RETURN`.

Las devoluciones parciales y el tratamiento de productos dañados o no
revendibles quedan fuera del alcance inicial.

### Ajustes

Un usuario autorizado puede corregir existencias mediante un ajuste con motivo obligatorio. Los ajustes no deben convertirse en una edición silenciosa del saldo.

La interfaz puede ofrecer la acción **Actualizar existencias** directamente desde la ficha del producto o de su variante para mantener una operación sencilla. Aunque el usuario la inicie desde Productos, el servidor debe procesarla como una operación de Inventario, crear el movimiento correspondiente y aplicar las mismas validaciones y permisos.

## 6. Reglas de negocio iniciales

- No se permiten existencias negativas.
- Toda modificación de existencias debe ser trazable.
- El stock se administra por variante, no por la ficha general del producto.
- Un producto archivado no debe recibir nuevas ventas, aunque su historial permanezca disponible.
- Una variante agotada no se muestra como disponible para venta.
- Los movimientos deben actualizar el saldo de forma consistente y atómica.
- Un fallo durante una operación no debe dejar un movimiento confirmado sin actualizar el saldo correspondiente, ni viceversa.
- Repetir la misma solicitud de movimiento no debe crear una segunda entrada o salida.

## 7. Relación con otros módulos

```text
Productos
    define productos y variantes

Inventario
    controla cantidades y movimientos

Ventas y pedidos
    solicita disponibilidad y genera salidas

Compras y recepción
    podrá originar entradas y relacionar proveedores
```

Inventario no administra proveedores, ventas ni pedidos; solo recibe las referencias necesarias para explicar el origen de un movimiento.

## 8. Presentación en la interfaz

La información podrá presentarse como tabla o como cartas según el contexto y el tamaño de pantalla.

La vista interna debe mostrar, como mínimo:

- Producto y variante.
- SKU o código de barras.
- Existencia actual.
- Umbral de stock bajo.
- Estado de disponibilidad.
- Acciones autorizadas.

Las acciones pueden agruparse en un menú compacto. El menú podrá ocultarse o mostrarse; cuando esté contraído, los iconos deben conservar etiquetas accesibles y mostrar contexto mediante tooltip o hover cuando corresponda.

La presentación visual no modifica las reglas del inventario ni sustituye la validación del servidor.

## 9. Auditoría y permisos

El módulo debe emitir eventos relevantes como:

- Carga de existencia inicial.
- Recepción confirmada.
- Venta registrada como salida.
- Devolución confirmada.
- Ajuste de inventario.
- Pérdida o merma registrada.
- Cambio del umbral de stock bajo.

Las operaciones de ajuste, recepción y confirmación de movimientos requieren permisos funcionales definidos para el módulo. Owner y Admin podrán administrarlas según sus permisos; los usuarios operativos solo podrán ejecutarlas si tienen autorización.

Permisos iniciales del módulo:

- `inventory.read`: consultar existencias y movimientos.
- `inventory.receive`: registrar recepciones.
- `inventory.adjust`: realizar ajustes y registrar pérdidas o mermas.
- `inventory.threshold.update`: modificar el umbral de stock bajo.

No se utiliza `delete`; los movimientos confirmados permanecen disponibles
para trazabilidad.

No se registran secretos ni información ajena a la trazabilidad del movimiento.

## 10. Fuera del alcance inicial

- Múltiples almacenes o sucursales.
- Transferencias entre ubicaciones.
- Lotes y fechas de caducidad.
- Control por número de serie, IMEI o unidad individual.
- Cantidades por peso, volumen u otras unidades decimales.
- Valoración FIFO o costo promedio.
- Costos contables avanzados.
- Inventario en consignación.
- Reglas automáticas de reabastecimiento.
- Alertas y notificaciones avanzadas.
- Integración directa con una pasarela de pago.
