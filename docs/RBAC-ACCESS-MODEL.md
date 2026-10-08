# Geedyx — Modelo de perfiles y accesos

Este documento fija las decisiones funcionales para crear cuentas y limitar
qué partes de Geedyx puede usar cada persona. La pantalla debe hablar de
**perfiles de acceso** y **acciones**; los códigos internos de autorización
pertenecen al API y al diagnóstico técnico.

## Decisiones acordadas

1. **Los perfiles representan responsabilidades.** Geedyx conserva los
   perfiles base Propietario, Administrador y Usuario. La empresa puede crear
   perfiles propios, por ejemplo Inventario o Ventas, y describir para qué se
   utilizan. Los perfiles base no se editan ni se eliminan.
2. **Cada acción tiene un propósito concreto y pertenece a un área.** La
   pantalla agrupa acciones por módulos y muestra nombres y descripciones en
   lenguaje de negocio. Solo aparecen acciones cuyo módulo ya esté disponible;
   las acciones futuras no se pueden conceder antes de implementar su módulo.
3. **Una cuenta puede tener varios perfiles.** Sus acciones se combinan: si
   cualquiera de sus perfiles permite una acción, la cuenta puede realizarla.
   En esta etapa no hay excepciones individuales ni reglas para denegar una
   acción concedida por otro perfil.
4. **Los accesos abarcan toda la empresa.** Cada perfil pertenece a la empresa
   que lo crea y solo se puede asignar a cuentas de esa empresa. Sucursales,
   bodegas y otros alcances se incorporarán cuando exista el modelo operativo
   correspondiente; no se simulan con roles separados.
5. **El acceso se concede con mínimo privilegio.** Crear perfiles y asignarlos
   requiere administrar perfiles de acceso. Ningún perfil personalizado puede
   administrar otros perfiles ni convertirse en Propietario. Solo un
   Propietario puede otorgar el perfil Propietario, con reautenticación y
   motivo, y el sistema protege al último Propietario activo.
6. **El perfil se elige al crear una cuenta y se puede cambiar después.** La
   creación guarda cuenta y accesos en una sola transacción. Los cambios de
   acceso quedan auditados; un perfil personalizado en uso no se elimina hasta
   retirarlo de todas las cuentas.
7. **El servidor aplica cada autorización y la interfaz la refleja.** Ocultar
   una opción solo mejora la navegación; las rutas del API verifican sesión,
   empresa y permiso. Las operaciones de seguridad quedan auditadas. Los
   detalles técnicos se reservan para diagnóstico y no se muestran en las
   pantallas normales.

## Alcance de esta entrega

- El catálogo compartido distingue acciones activas, disponibles para asignar
  y visibles en la aplicación.
- El catálogo activo incluye Panel, Configuración, Usuarios, Perfiles de
  acceso, Sesiones, Catálogo y Actividad administrativa.
- Inventario, Clientes, Proveedores, Ventas, Pagos y Reportes siguen ocultos
  hasta que sus módulos estén implementados y validados.
- Los perfiles personalizados pueden combinar acciones activas de las áreas
  disponibles, pero no pueden otorgar administración de perfiles.
- La asignación puede hacerse durante el alta y desde la administración de
  perfiles. Se permite combinar varios perfiles.
- El alcance actual es por empresa. No existen permisos directos por cuenta,
  sucursal o bodega.

## Criterios para ampliar el catálogo

Al implementar un módulo, su documento funcional define qué acciones necesita,
qué operaciones protegen y qué alcance de datos aplican. Se habilitan en el
catálogo después de proteger las rutas del API y añadir pruebas de autorización.
La interfaz ofrece cada acción con una descripción entendible y el módulo se
considera listo tras la validación visual de los flujos permitidos y rechazados.

El estado vigente y la evidencia de pruebas se registran en
[`MODULE-STATUS.md`](./MODULE-STATUS.md) y
[`VALIDATION-BASE.md`](./VALIDATION-BASE.md).
