# GEEDYX — Guía de experiencia de usuario

## 1. Propósito

Este documento define cómo debe comportarse la experiencia de usuario de
Geedyx al informar estados, solicitar decisiones, mostrar errores y responder
a las acciones del usuario.

La experiencia debe mantener al usuario en contexto, explicar qué está
ocurriendo con lenguaje claro y proporcionar una respuesta proporcional a la
importancia de cada situación.

Este documento define comportamiento y patrones de interacción. La identidad
visual, los tokens, el layout, los componentes base y sus detalles de
implementación se mantienen en `UI-FRONTEND.md`.

## 2. Principios de interacción

- El usuario siempre debe saber qué está haciendo, qué ocurrió y qué puede
  hacer a continuación.
- Los mensajes deben utilizar lenguaje funcional y no exponer detalles
  técnicos innecesarios.
- Una acción pendiente debe conservar los datos introducidos cuando sea
  posible.
- Las acciones sensibles o destructivas requieren una decisión explícita.
- El nivel de interrupción debe ser proporcional al impacto de la situación.
- Ningún estado importante debe comunicarse únicamente mediante color o un
  icono.
- La interfaz debe evitar duplicar acciones mientras una operación está
  pendiente.

## 3. Canales de comunicación

Geedyx utilizará cuatro mecanismos principales. No son intercambiables:

| Mecanismo | Propósito | Momento de uso |
| --- | --- | --- |
| **Diálogo** | Solicitar confirmación o datos antes de continuar | Acción sensible, destructiva o que requiere decisión |
| **Toast** | Informar el resultado breve de una acción | Operación completada o información puntual |
| **Alerta o banner** | Mantener visible una condición que requiere atención | Problema persistente, estado degradado o advertencia contextual |
| **Mensaje inline** | Explicar un error en un campo o sección | Validación, datos inválidos o error relacionado con el contenido |

Regla general:

- El **diálogo** pregunta antes de ejecutar.
- El **toast** informa después de ejecutar.
- La **alerta** permanece mientras exista una condición relevante.
- El **mensaje inline** indica dónde y cómo corregir un problema.

Los niveles semánticos disponibles son `success`, `info`, `warning` y
`error`. El nivel expresa la importancia de la situación y no debe depender
solo del color.

## 4. Diálogos de confirmación

El diálogo es el mecanismo para detener temporalmente el flujo y obtener una
decisión explícita. Se utilizará para acciones como:

- Cancelar una venta o devolver una operación.
- Confirmar una transferencia o una acción que cambie su estado.
- Ajustar existencias manualmente.
- Archivar o eliminar lógicamente un producto.
- Restaurar valores predeterminados de configuración.
- Cerrar sesiones activas u otras acciones administrativas sensibles.

Cada diálogo debe:

- Explicar la acción y su consecuencia concreta.
- Identificar el objeto afectado cuando corresponda.
- Utilizar acciones explícitas como `Cancelar` y `Confirmar`.
- Diferenciar visual y textualmente las acciones destructivas.
- Mostrar estado pendiente y evitar envíos duplicados.
- Permitir cancelar sin perder el contexto o el borrador cuando sea posible.

No se utilizarán diálogos para mostrar confirmaciones informativas que no
requieren una decisión. No se apilarán varios diálogos.

## 5. Formularios accionados

Las pantallas de configuración y administración muestran primero un resumen del
estado actual. Los formularios de alta y edición se abren mediante una acción
explícita como `Editar configuración`, `Nuevo producto`, `Crear usuario` o
`Asignar roles`; no deben aparecer activos dentro del contenido principal.

Estos formularios pueden usar un modal amplio cuando la tarea se mantiene en el
contexto de la pantalla. El modal debe conservar el borrador si ocurre un error,
mostrar el error junto al formulario y cerrar solo después de confirmar la
persistencia. En móvil los campos pasan a una columna, sin perder el footer de
acciones.

## 6. Toasts

Los toasts son mensajes breves y no bloqueantes para comunicar resultados
simples, por ejemplo:

- `Producto guardado correctamente.`
- `Pago confirmado.`
- `Existencias actualizadas.`
- `Configuración actualizada.`

Reglas iniciales:

- Deben aparecer cerca del área de contexto sin ocultar la acción principal.
- Deben poder cerrarse manualmente y desaparecer automáticamente cuando sea
  seguro hacerlo.
- No deben contener decisiones complejas ni formularios.
- Un error importante debe mostrarse también junto al contenido afectado;
  nunca debe comunicarse únicamente mediante un toast.
- El mismo resultado no debe producir una cadena repetitiva de toasts.

La primera versión no tendrá un centro persistente de notificaciones, ni
notificaciones push, correo o canales externos.

## 7. Alertas y banners

Las alertas se utilizarán para condiciones que siguen vigentes y requieren
atención contextual. Algunos ejemplos son:

- El sistema está disponible con capacidad reducida.
- Una configuración necesaria está incompleta.
- El almacenamiento local no está disponible.
- Existe una advertencia relevante en una pantalla de inventario o ventas.

Una alerta debe explicar:

- Qué ocurre.
- Qué impacto tiene.
- Qué puede hacer el usuario, si existe una acción disponible.

Las alertas no deben utilizarse como sustituto de los errores de campo ni
convertir cada indicador operativo, como stock bajo, en una interrupción.

## 8. Mensajes inline y estados de pantalla

Los errores de validación se mostrarán junto al campo o sección afectada. El
formulario debe conservar los valores válidos y señalar claramente qué debe
corregirse.

Las pantallas de datos deben contemplar como mínimo:

- `idle`: pantalla lista para interactuar.
- `pending`: operación en curso; la acción involucrada queda protegida contra
  duplicación.
- `success`: operación completada y datos actualizados.
- `failure`: operación fallida, con explicación y posibilidad de recuperación
  cuando sea viable.

Los estados de carga, vacío, error recuperable, no autorizado, deshabilitado y
confirmación destructiva deben ser distinguibles. Un error de permisos no debe
presentarse como si fuera un fallo técnico.

## 9. Aplicación a Geedyx

Algunos ejemplos de la primera versión:

- Guardar un producto muestra un toast de éxito; un error de sus campos queda
  junto al formulario.
- Ajustar inventario abre un diálogo para capturar y confirmar el movimiento;
  al completarse muestra un toast y actualiza las existencias.
- Un pago por transferencia pendiente se muestra como estado dentro de la
  venta; confirmar el pago requiere una acción explícita.
- Stock bajo se presenta como estado o alerta contextual en inventario y
  dashboard, no como un toast cada vez que se abre una pantalla.
- Un problema de salud del sistema se muestra como alerta persistente con un
  mensaje seguro y una referencia útil para soporte.

## 10. Patrones de presentación de datos

Cada pantalla debe elegir su patrón según el tipo de información y la tarea.
Los patrones actuales de Geedyx son acordeones, tablas y listas de filas
simples. No se deben combinar contenedores para crear cards dentro de otras
cards ni cambiar de patrón solo por el tamaño del viewport.

### Acordeón

Usar acordeones cuando cada elemento agrupe detalles que el usuario puede
consultar u ocultar sin salir de la pantalla, como los perfiles de acceso.

- Mantener una sola columna de filas, sin cards anidadas.
- Colocar el chevron al inicio y las acciones disponibles al final de la fila.
- Alinear el encabezado de la sección con las filas y mantener una jerarquía
  visual discreta.
- El contenido expandido conserva los detalles existentes y no altera la
  simetría de las demás filas.

### Tabla

Usar tablas cuando los registros comparten campos comparables o se necesite
consultarlos, ordenarlos, filtrarlos y operarlos como conjunto. Usuarios,
auditoría y categorías son ejemplos actuales.

- Usar encabezado tonal con jerarquía menor que los valores de cada fila.
- Mantener divisores de borde a borde, espaciado simétrico y contenido
  alineado verticalmente al centro.
- Agrupar las acciones de fila al final cuando existan y ofrecerlas en un menú
  de tres puntos con iconos reales y texto.
- En pantallas pequeñas, conservar la tabla y permitir scroll horizontal en su
  contenedor; no convertirla automáticamente en tarjetas o filas distintas.
- Mantener el resumen y la paginación fuera del área de scroll horizontal para
  que sigan accesibles al desplazar la tabla.
- Usar el mismo patrón para pantallas nuevas con datos tabulares.

### Lista de filas simples

Usar filas simples cuando los elementos sean unidades independientes y no
necesiten columnas comparables, como las sesiones activas.

- Mantener una fila clara por elemento, con los datos y controles alineados.
- Evitar presentar cada elemento como una card si una lista plana comunica
  mejor la relación entre ellos.
- Conservar el mismo patrón al adaptar la pantalla a móvil y tablet.

### Excepción de Productos

Productos tendrá una presentación especializada que se definirá más adelante.
No aplicar automáticamente a esa pantalla las decisiones futuras para tablas
genéricas, tarjetas o selectores de vista hasta que se acuerde su diseño.

## 11. Sidebar y navegación lateral

La consola utilizará una navegación lateral con dos estados principales:

- **Expandida:** muestra los módulos padres, sus módulos hijos y las etiquetas
  completas.
- **Compacta:** muestra principalmente los iconos para dejar más espacio al
  contenido.

En desktop, al pasar el cursor sobre la sidebar compacta, la navegación se
expandirá temporalmente como una capa sobre el contenido. Esta expansión no
debe cambiar el ancho ni reorganizar la página principal. Debe mantenerse
abierta mientras el cursor permanezca sobre la sidebar o su capa expandida y
cerrarse al salir, salvo que el usuario la haya fijado.

La sidebar tendrá un control explícito para fijar o liberar la vista
expandida. La navegación no dependerá únicamente del hover: la expansión
fijada debe poder activarse con teclado y permanecer abierta hasta que el
usuario la cierre.

Cuando la vista está fijada y expandida, la sidebar ocupa su ancho dentro del
layout y el contenido principal se ajusta a ese espacio. Cuando está compacta,
la expansión por hover o focus funciona como una capa temporal sobre el
contenido y no lo reorganiza.

Reglas de navegación:

- El módulo padre activo y la opción hija activa deben identificarse de forma
  persistente.
- El estado activo y el hover conservan una superficie neutra; el accent se
  reserva para el icono y el texto de navegación.
- El grupo que contiene la ruta actual debe permanecer expandido.
- Los grupos padres podrán contraerse o expandirse sin perder la ruta actual.
- En la vista compacta, cada icono debe tener una etiqueta accesible; el
  tooltip complementa la información, pero no reemplaza el nombre accesible.
- La capa expandida debe respetar la altura disponible de la pantalla y no
  superar el viewport.
- Si existen más opciones que espacio disponible, el área de navegación debe
  tener scroll vertical independiente.
- El contenido principal conservará su propio scroll; la navegación no debe
  desplazarlo ni depender de su posición.
- Cuando existan encabezado o acciones fijas dentro de la sidebar, solo la
  lista de navegación debe desplazarse. Se evitarán niveles innecesarios de
  scroll anidado.

En tablet y móvil no se dependerá del hover. La navegación se mostrará como
drawer superpuesto, abierto mediante un control visible, con cierre por
Escape, acción de cierre y pulsación fuera cuando corresponda. El foco debe
permanecer dentro del drawer mientras esté abierto y volver al control que lo
activó al cerrarse.

La preferencia de estado compacto o expandido y la apertura de grupos puede
conservarse inicialmente de forma local por usuario y dispositivo. No forma
parte de la configuración global del sistema.

## 12. Movimiento y efectos

La interfaz no utilizará animaciones decorativas. Sí podrá utilizar efectos
funcionales y breves para comunicar:

- Hover, focus y estado presionado.
- Cambio de estado de un control.
- Apertura y cierre de diálogos, drawers, menús y toasts.
- Carga y finalización de operaciones.

Los efectos no deben retrasar la acción ni ocultar información. La interfaz
debe respetar `prefers-reduced-motion` y reducir estos efectos cuando el
usuario lo solicite.

## 13. Alcance inicial y futuras extensiones

El primer lanzamiento incluye diálogos, toasts, alertas contextuales, mensajes
inline y estados de pantalla. Quedan para futuras versiones un centro de
notificaciones, notificaciones push o por correo, reglas avanzadas de
priorización, historial de notificaciones y acciones globales en tiempo real.
