# Geedyx — Panel operativo

## 1. Propósito y alcance

El Panel operativo es la página principal de Geedyx después del login. Su objetivo es mostrar un resumen útil del estado actual del negocio y ofrecer accesos rápidos a las operaciones más frecuentes. La ruta técnica de esta pantalla continúa siendo `/app/dashboard`.

El Panel operativo no sustituye a Reportes ni implementa cálculos financieros propios. Debe utilizar las métricas y reglas definidas por los módulos operativos y `REPORTS.md`.

## 2. Rutas

La aplicación interna utilizará el espacio protegido `/app`:

```text
/app              espacio protegido de la aplicación
/app/dashboard    página principal
/app/products     productos y catálogo
/app/inventory    inventario
/app/sales        ventas
/app/customers    clientes y proveedores
/app/reports      reportes
/app/audit        auditoría autorizada
```

Cuando un usuario autenticado acceda a `/app`, será redirigido a `/app/dashboard`.

El Panel operativo no es una ruta pública y los clientes externos no tienen acceso a él.

## 3. Resumen de indicadores

La vista inicial podrá mostrar tarjetas con:

- Ventas del día.
- Ventas del período seleccionado.
- Pagos pendientes.
- Productos con pocas unidades.
- Productos agotados.

Los valores monetarios deben mostrar la moneda principal configurada y el período utilizado para calcularlos.

No se mostrarán inicialmente utilidad, márgenes, impuestos, caja, bancos ni contabilidad porque esos datos están fuera del primer lanzamiento.

## 4. Actividad de ventas

El Panel operativo podrá mostrar:

- Tendencia de ventas por día o período.
- Distribución de ventas entre efectivo y transferencia.
- Ventas recientes.
- Ventas pendientes de pago.
- Acceso al detalle de una venta.

El Panel operativo presenta un resumen. Los filtros y el detalle completo pertenecen a `REPORTS.md` y `SALES.md`.

## 5. Alertas de inventario

La vista podrá mostrar:

- Productos con pocas unidades.
- Productos agotados.
- Variantes con movimientos recientes.
- Acceso para actualizar existencias cuando el usuario tenga permiso.

La actualización iniciada desde el Panel operativo debe respetar las mismas reglas y movimientos definidos en `INVENTORY.md`.

## 6. Acciones rápidas

El Panel operativo podrá mostrar acciones rápidas según los permisos del usuario:

- Nueva venta.
- Nuevo producto.
- Nuevo cliente.
- Actualizar existencias.
- Ver reportes.
- Configurar el negocio.

Una acción no debe mostrarse si el usuario no tiene autorización para ejecutarla.

## 7. Configuración pendiente

Si faltan valores obligatorios de Configuración general, el Panel operativo debe mostrar una alerta persistente, por ejemplo:

```text
Completa la configuración de tu negocio
```

El aviso dirige a Configuración. No reabre el instalador ni modifica el estado de instalación.

## 8. Estado general del sistema

El Panel operativo debe mostrar una tarjeta de estado general para Owner y Admin con permiso.

Estados iniciales:

- `HEALTHY`: todo funciona correctamente.
- `DEGRADED`: el sistema funciona, pero existe una advertencia.
- `UNAVAILABLE`: un componente necesario no está disponible.

La información inicial podrá incluir:

- API o servicio de Geedyx.
- Base de datos.
- Migraciones requeridas.
- Almacenamiento local.
- Estado de instalación.

La tarjeta debe presentar un mensaje comprensible, por ejemplo:

```text
Estado del sistema
✓ Todo funciona correctamente
```

Cuando exista un problema, debe mostrar una explicación segura y una referencia para soporte. No debe mostrar cadenas de conexión, secretos, stack traces ni detalles técnicos sensibles.

La información puede consultarse desde una vista futura como `/app/system-health`, pero inicialmente basta con el resumen dentro del Panel operativo. Esta capacidad utiliza internamente los checks de health y readiness definidos en `TECH-STACK.md`.

Los usuarios sin permiso y los clientes externos no deben consultar el estado técnico detallado.

Las futuras versiones podrán incorporar diagnósticos, alertas, historial y acciones de recuperación. Esas funciones no forman parte del alcance inicial.

## 9. Adaptación por permisos

El contenido debe adaptarse al alcance del usuario:

- Owner o Admin: resumen de ventas, pagos, inventario, configuración y actividad administrativa permitida.
- Usuario de ventas: ventas, clientes, pagos pendientes y productos autorizados.
- Usuario de inventario: existencias, movimientos y alertas autorizadas.
- Cliente externo: sin acceso a `/app`.

La visibilidad de la información y la autorización de las acciones se validan en el servidor. Ocultar un componente en la interfaz no sustituye los permisos del backend.

Permisos iniciales del módulo:

- `dashboard.read`: consultar el Panel operativo.
- `system_health.read`: consultar el estado general del sistema.

## 10. Presentación y experiencia de uso

El Panel operativo debe mantener una jerarquía clara:

```text
Resumen de indicadores
    ↓
Actividad de ventas
    ↓
Pagos pendientes y alertas de inventario
    ↓
Acciones rápidas
```

Podrá utilizar tarjetas, tablas compactas y gráficos únicamente cuando ayuden a entender una tendencia o comparación. No debe convertirse en una pantalla saturada de widgets.

Debe contemplar:

- Estados de carga.
- Estado vacío para un negocio sin operaciones.
- Error recuperable.
- Datos actualizados.
- Enlaces al detalle o reporte correspondiente.
- Diseño responsive.
- Menús de acciones compactos y accesibles.

La interfaz debe utilizar los tokens, componentes, estados y patrones definidos en `UI-FRONTEND.md`.

## 11. Consistencia de datos

- El Panel operativo es de solo lectura, excepto por acciones rápidas autorizadas.
- Los indicadores utilizan las mismas definiciones que Reportes.
- Las consultas respetan la moneda configurada y utilizan la zona horaria
  global del negocio para los indicadores y períodos operativos.
- Las operaciones de lectura no producen cambios de negocio.
- Las acciones rápidas utilizan los endpoints y reglas de sus módulos de origen.

## 12. Fuera del alcance inicial

- Personalización libre de widgets.
- Paneles por departamento configurables por usuario.
- Métricas de utilidad o margen.
- Contabilidad.
- Caja y bancos.
- Reportes fiscales.
- Analítica avanzada.
- Alertas automáticas por correo o canales externos.
- Panel para clientes externos.
