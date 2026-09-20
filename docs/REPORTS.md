# Geedyx — Reportes operativos

## 1. Propósito y alcance

Este documento define el alcance inicial de los reportes operativos de Geedyx. Los reportes permiten consultar información consolidada de Ventas, Inventario, Clientes y pagos registrados sin modificar los datos de origen.

La primera versión ofrecerá reportes definidos y útiles para la operación diaria. No incluirá un generador completamente dinámico de reportes ni contabilidad avanzada.

## 2. Principios

- Los reportes son de solo lectura.
- Los datos provienen de los módulos operativos y no se duplican como información editable.
- Las métricas deben utilizar las mismas reglas que Ventas e Inventario.
- Las consultas respetan la moneda principal configurada.
- Los períodos, agrupaciones y filtros de fecha utilizan la zona horaria
  global del negocio.
- Los reportes deben indicar claramente el período y los filtros aplicados.
- La interfaz no debe presentar como utilidad o margen un dato que no pueda calcularse con costos confiables.

## 3. Acceso

- Owner: puede consultar todos los reportes.
- Admin: puede consultar reportes según sus permisos.
- Usuario operativo: puede consultar reportes solo si recibe el permiso funcional correspondiente.
- Cliente externo: no tiene acceso a los reportes internos.

La autorización se valida en el servidor. Consultar un reporte no permite modificar ventas, pagos, clientes ni inventario.

Permiso inicial del módulo:

- `reports.read`: consultar reportes operativos.

## 4. Reporte de ventas

Debe permitir consultar, como mínimo:

- Cantidad de ventas.
- Total vendido.
- Ventas por período.
- Ventas por método de pago.
- Ventas por estado.
- Ventas por producto o variante.
- Ventas por cliente.
- Ventas sin cliente identificado.
- Descuentos aplicados.
- Ventas canceladas o devueltas.

La consulta debe diferenciar ventas completadas, pendientes, canceladas y devueltas. El total de ventas completadas no debe incluir operaciones canceladas. Las devoluciones deben mostrarse por separado y, cuando aplique, como reducción del resultado neto operativo.

Filtros iniciales:

- Rango de fechas.
- Estado de venta.
- Método de pago.
- Cliente.
- Producto o variante.
- Usuario que registró la venta.

## 5. Reporte de inventario

Debe permitir consultar:

- Existencia actual por variante.
- Productos disponibles.
- Productos con pocas unidades.
- Productos agotados.
- Entradas y salidas por período.
- Ajustes realizados.
- Pérdidas o mermas.
- Variantes con mayor movimiento.

Filtros iniciales:

- Categoría.
- Producto o variante.
- Estado de disponibilidad.
- Tipo de movimiento.
- Rango de fechas.
- Usuario que realizó el movimiento.

El reporte utiliza el saldo y los movimientos definidos por `INVENTORY.md`. No permite editar existencias desde la consulta.

## 6. Reporte de pagos

Debe permitir consultar:

- Pagos confirmados.
- Transferencias pendientes.
- Pagos cancelados o devueltos.
- Montos por período.
- Montos por método de pago.
- Montos recibidos, montos aplicados y cambio entregado en pagos en efectivo.
- Ventas asociadas a cada pago.
- Usuario que confirmó el pago.

Los pagos se muestran en la moneda principal configurada y conservan la referencia de la venta relacionada.

## 7. Datos y cálculos

Los reportes deben utilizar:

- Ventas completadas como base de ventas confirmadas.
- Estados de pago definidos en `SALES.md`.
- Movimientos y saldos definidos en `INVENTORY.md`.
- Datos históricos congelados en las líneas de venta.

No se calcularán inicialmente:

- Utilidad real.
- Margen.
- Costo promedio.
- FIFO.
- Impuestos.
- Saldos contables.
- Conciliación bancaria.

Esos cálculos requieren costos, reglas fiscales o módulos financieros que están fuera del primer lanzamiento.

## 8. Presentación en la interfaz

Cada reporte puede utilizar una combinación de:

- Tarjetas de resumen para métricas principales.
- Tablas detalladas.
- Gráficos únicamente cuando ayuden a comprender una tendencia o comparación.
- Filtros visibles.
- Indicador del período seleccionado.
- Estado vacío cuando no existan datos.
- Estado de carga y error recuperable.
- Paginación para listados extensos.

La interfaz debe utilizar los patrones definidos en `UI-FRONTEND.md`. Los reportes no deben convertirse en una pantalla de datos sin jerarquía o sin explicar qué representa cada total.

## 9. Consulta y consistencia

- Las consultas no cambian datos operativos.
- Deben respetar permisos y contexto del negocio.
- Deben utilizar la zona horaria global del negocio para agrupar fechas y
  períodos.
- Los timestamps individuales pueden mostrarse en la zona horaria personal del
  usuario cuando sea una preferencia de visualización, sin alterar el período
  consultado.
- Deben mostrar la moneda utilizada en los totales.
- Una venta cancelada o devuelta debe conservarse en el detalle histórico.
- Las consultas repetidas no producen efectos secundarios.

## 10. Auditoría

La consulta de reportes puede registrarse cuando sea una acción administrativa relevante, especialmente si en el futuro se incorpora exportación. El reporte no debe registrar datos sensibles innecesarios ni alterar los eventos de origen.

Los cambios de datos se auditan en sus módulos respectivos, no dentro del módulo de Reportes.

## 11. Fuera del alcance inicial

- Generador de reportes personalizado.
- Constructor de filtros arbitrarios.
- Exportación avanzada.
- Reportes fiscales.
- Contabilidad de partida doble.
- Caja y bancos.
- Conciliación bancaria.
- Compras.
- Costos y utilidad avanzada.
- Reportes multiempresa o multi-tenant.
- Reportes públicos para clientes externos.
