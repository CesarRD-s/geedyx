# GEEDYX — Visión general y alcance del primer lanzamiento

## 1. Propósito

Este es el documento principal de contexto funcional de Geedyx. Registra qué es el sistema, qué módulos se contemplan para su primer lanzamiento y cómo se definirá progresivamente el alcance de cada módulo.

No sustituye la documentación detallada de los módulos. Las decisiones específicas, flujos, reglas, permisos, entidades y pendientes de cada área deben quedar en su archivo `.md` correspondiente.

## 2. Visión de Geedyx

Geedyx será un sistema ERP modular. Su diseño se construirá por áreas funcionales, manteniendo una base común de autenticación, usuarios, configuración, autorización, auditoría y experiencia de uso.

La definición funcional será gradual. No se asumirán funciones de un módulo únicamente por incluirlo en la lista general; cada módulo deberá discutirse, cerrarse y documentarse antes de considerarse definido.

## 3. Frontera de complejidad inicial

Geedyx tendrá una experiencia de consola SaaS inspirada en productos como Azure, AWS o GCP, pero no será una plataforma de infraestructura.

El primer lanzamiento no introducirá organizaciones complejas, jerarquías empresariales, tenants, workspaces avanzados ni modelos de infraestructura multi-tenant. La base inicial será una instalación operativa sencilla para un solo negocio, con sus usuarios, roles, permisos y módulos de negocio.

El diseño deberá evitar bloquear una evolución futura, pero no incorporará complejidad de organizaciones o infraestructura antes de que exista una necesidad real del producto.

## 4. Módulos del primer lanzamiento

El primer lanzamiento se concentrará en una instalación operativa sencilla con los siguientes módulos y capacidades:

1. Instalación inicial.
2. Autenticación y usuarios.
3. Configuración general.
4. Productos y catálogo.
5. Clientes y proveedores.
6. Inventario operativo.
7. Ventas internas, comprobantes y pagos.
8. Panel operativo.
9. Reportes operativos.
10. Auditoría transversal.

Los pagos iniciales se limitarán a efectivo y transferencia, con registro del método, estado, monto, fecha y usuario que confirmó la operación. Esto no constituye todavía un módulo de Caja y bancos.

Las ventas internas forman parte del primer lanzamiento. La tienda pública, el carrito y las cuentas de clientes externos quedan preparados conceptualmente, pero serán una extensión futura y opcional para negocios que decidan habilitar un sitio público.

## 5. Extensiones futuras

Quedan fuera del primer lanzamiento y podrán definirse posteriormente:

- Compras como flujo comercial completo.
- Caja y bancos.
- Reconciliación bancaria y contabilidad avanzada.
- Múltiples almacenes, sucursales o ubicaciones.
- Lotes, vencimientos y caducidad.
- Control por números de serie o IMEI.
- Valoración de inventario y costos avanzados.
- Tienda pública, carrito, cuentas externas y pedidos desde un dominio público.
- Servicios y otros tipos de artículos no definidos todavía.

Esta separación mantiene una primera versión funcional sin impedir que Geedyx crezca hacia esas capacidades.

## 6. Método de definición funcional

Cada módulo se trabajará de manera independiente y ordenada:

1. Seleccionar el módulo.
2. Conversar sobre su propósito y alcance.
3. Identificar flujos, reglas, datos, permisos y relaciones con otros módulos.
4. Revisar decisiones y pendientes.
5. Cerrar el diseño funcional acordado.
6. Documentarlo o actualizar su archivo `.md` correspondiente.
7. Continuar con el siguiente módulo.

No se propondrán funciones de un módulo antes de discutirlas. La documentación debe reflejar decisiones tomadas, no funcionalidades hipotéticas.

## 7. Orden de trabajo

El trabajo funcional comenzó con **Autenticación y usuarios**, continuó con **Configuración general**, **Instalación**, **Productos y catálogo**, **Inventario operativo**, **Clientes y proveedores**, **Ventas internas, comprobantes y pagos**, **Reportes operativos**, **Auditoría** y **Panel operativo**. La base funcional del primer lanzamiento está documentada.

Compras, Caja y bancos, la tienda pública y las capacidades avanzadas de inventario permanecerán como extensiones futuras.

El orden podrá cambiar si durante la planificación se identifica una dependencia funcional; cualquier cambio deberá quedar reflejado en este documento.

## 8. Documentación por módulo

Cada documento modular deberá consolidar, según corresponda:

- Propósito.
- Alcance incluido y excluido.
- Actores y permisos.
- Flujos principales.
- Reglas de negocio.
- Entidades y datos relevantes.
- Estados y transiciones.
- Integraciones o dependencias.
- Auditoría.
- Decisiones tomadas.
- Pendientes y criterios de aceptación.

La profundidad dependerá del módulo. No se agregarán secciones artificialmente si no aplican.

## 9. Estado actual

### Autenticación y usuarios

Diseño funcional documentado en `AUTH-USERS.md`. Incluye autenticación, usuarios, sesiones, dispositivos, recuperación de contraseña, perfil, preferencias, roles, permisos y auditoría.

### Interfaz frontend

Especificación visual documentada en `UI-FRONTEND.md`. Este archivo se conserva sin cambios y sirve como referencia transversal para los módulos.

### Experiencia de usuario

Las reglas transversales de interacción, comunicación de estados, diálogos,
toasts, alertas, mensajes inline y efectos funcionales están documentadas en
`UX.md`. `UI-FRONTEND.md` conserva la especificación visual y de componentes.

### Configuración general

La separación inicial de valores globales está documentada en `CONFIGURATION.md`. El alcance mínimo inicial del módulo está documentado.

### Instalación inicial

El flujo de preparación de una instalación nueva, creación del primer Owner, finalización y bloqueo del setup está documentado en `INSTALLATION.md`.

### Productos y catálogo

El alcance inicial del catálogo, productos, categorías, opciones, variantes, códigos de barras y multimedia está documentado en `PRODUCTS.md`. Los servicios, pedidos, pagos y ventas se definirán en sus módulos correspondientes; el alcance inicial de Inventario ya está documentado en `INVENTORY.md`.

### Inventario operativo

El alcance inicial de existencias por variante, movimientos, recepción, ajustes, estados de disponibilidad y umbral de stock bajo está documentado en `INVENTORY.md`.

### Clientes y proveedores

El alcance inicial de los registros comerciales, clientes con cuenta pública opcional, proveedores sin acceso al sistema y vinculación del historial está documentado en `CUSTOMERS-SUPPLIERS.md`.

### Auditoría

La separación entre los eventos emitidos por cada módulo y la capacidad transversal de auditoría está documentada en `AUDIT.md`. La primera versión permite consulta administrativa de solo lectura para Owner y Admin con permiso.

### Ventas, comprobantes y pagos

El alcance inicial de ventas internas, comprobantes de venta, pagos en efectivo o transferencia, actualización de inventario y registro financiero operativo está documentado en `SALES.md`. La tienda pública, los pedidos desde un dominio externo y la facturación fiscal quedan para futuras extensiones.

### Reportes operativos

El alcance inicial de reportes operativos de ventas, inventario y pagos está documentado en `REPORTS.md`. El generador dinámico, los reportes fiscales, la contabilidad y los cálculos avanzados quedan fuera del primer lanzamiento.

### Panel operativo

El alcance inicial de la página principal protegida, sus indicadores operativos, estado general del sistema, actividad reciente, alertas y acciones rápidas está documentado en `DASHBOARD.md`. El estado general será operativo y acotado para Owner y Admin con permiso; los diagnósticos avanzados quedan para futuras versiones.

### Compras y Caja y bancos

No forman parte del primer lanzamiento. Se mantienen como extensiones futuras y no deben tratarse como dependencias necesarias para la primera versión operativa.

## 10. Base técnica

Las decisiones iniciales de Next.js, NestJS, PostgreSQL, monorepo y utilidades de desarrollo están documentadas en `TECH-STACK.md`.

## 11. Regla de mantenimiento

Este documento se actualizará cuando se modifique la lista de módulos, el orden de trabajo, el estado de definición o una decisión que afecte a todo Geedyx.

Los detalles propios de cada módulo se mantendrán en su archivo específico para evitar concentrar toda la documentación en un único documento.
