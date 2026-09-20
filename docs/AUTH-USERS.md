# Geedyx — Diseño funcional de autenticación y usuarios

## 1. Propósito y alcance

Documento base para identidad, autenticación, usuarios, sesiones, recuperación de contraseña, perfil, preferencias, roles, permisos y auditoría. Establece decisiones funcionales iniciales para construir una base segura y coherente para el ERP.

## 2. Principios

- Separar identidad, autenticación, autorización, sesiones y perfil.
- Toda sesión debe poder revocarse del lado del servidor.
- Aplicar mínimo privilegio y mantener trazabilidad.
- Las preferencias individuales heredan inicialmente la configuración global.
- La moneda y los parámetros operativos pertenecen al sistema o al negocio, no al perfil.
- Las contraseñas se almacenan únicamente como hash seguro.

## 3. Módulos

### Autenticación

Incluye inicio de sesión, validación de cuenta, cambio obligatorio en el primer acceso y cierre de sesión. Una cuenta puede estar `ACTIVE`, `DISABLED` o `LOCKED`; el estado de cuenta se mantiene separado de `password_change_required`.

Los intentos fallidos deben limitarse para reducir ataques de fuerza bruta. Después de 5 intentos consecutivos fallidos, la cuenta queda bloqueada temporalmente durante 15 minutos. El bloqueo automático debe distinguirse del bloqueo administrativo mediante una razón y una fecha de liberación. Un Owner/Admin con permiso puede desbloquearla antes, con reautenticación, motivo y auditoría. Al habilitarse, el contador de intentos fallidos se reinicia.

Los mensajes de login no deben revelar si el correo existe, si la contraseña fue la incorrecta, si la cuenta está inactiva o si está bloqueada. En todos esos casos se utilizará un mensaje general como: `No se pudo iniciar sesión. Verifica tu correo y contraseña.` La interfaz no mostrará el tiempo restante del bloqueo.

Geedyx aplicará rate limit en el servidor por cuenta, origen de red y operación. El login contará los fallos por cuenta y bloqueará temporalmente después de 5 intentos consecutivos; además, se limitará el volumen de solicitudes por IP u otro origen para reducir ataques distribuidos. Las solicitudes de recuperación y la validación de tokens tendrán límites propios por cuenta, origen y solicitud. Los límites secundarios serán internos del backend y no se expondrán como configuración funcional del usuario. Cuando corresponda se responderá con `429 Too Many Requests` sin revelar si la cuenta existe.

### Usuarios

Owner y Admin, si tienen el permiso correspondiente, pueden crear, activar, desactivar y bloquear usuarios, asignar roles, consultar sesiones y autorizar recuperaciones. El correo será el único identificador de acceso y deberá ser único dentro de Geedyx.

El correo debe validarse con una regla razonable de formato, normalizarse para evitar duplicados por mayúsculas/minúsculas y conservarse con un límite de longitud. No se exigirá verificación por correo en la primera versión, porque no habrá proveedor de correo integrado.

La primera versión no utilizará proveedores de correo ni OTP. Al crear el usuario, Geedyx generará una contraseña temporal y el administrador la entregará directamente al usuario por un canal controlado.

En una instalación nueva no existirá ningún usuario. El flujo de instalación inicial será responsable de detectar esa situación y solicitar la creación del primer Owner. AUTH-USERS define la cuenta, el rol y la autoridad de ese Owner; el proceso general de instalación está documentado en `INSTALLATION.md`.

### Política y almacenamiento de contraseñas

La contraseña debe tener como mínimo 8 caracteres e incluir al menos una letra mayúscula, un número y un carácter especial. Se permitirán contraseñas más largas y no se impondrá un límite máximo pequeño que impida utilizar frases de contraseña.

Las contraseñas se almacenarán mediante `Argon2id`, con un `salt` aleatorio y único para cada contraseña. El `salt`, el algoritmo y sus parámetros pueden persistirse junto con el resultado porque no son secretos; la contraseña original nunca se almacena ni se puede recuperar. El valor debe recalcularse y compararse mediante la biblioteca de contraseñas del servidor, sin exponerlo en respuestas, logs o auditoría.

Parámetros iniciales internos:

```text
algorithm = Argon2id
version = 19
memoryCost = 19 MiB
timeCost = 2
parallelism = 1
salt = generado automáticamente por la biblioteca
hashLength = 32 bytes
```

Estos valores no serán configurables por el usuario ni por el Owner en la primera versión. Podrán aumentarse posteriormente después de medir el rendimiento del servidor y mantener una verificación segura sin saturar el sistema.

Las contraseñas temporales y definitivas siguen la misma protección. Los tokens de recuperación no se tratarán como contraseñas: se generarán con un generador criptográficamente seguro y se persistirá únicamente un hash seguro o HMAC-SHA-256 junto con el usuario, la solicitud, su expiración y el control de intentos. El uso de un `pepper` separado queda como medida opcional futura y no es requisito de la primera versión.

### Cuenta

La cuenta representa la identidad de acceso y la seguridad del usuario. El correo único es el identificador de acceso y también podrá utilizarse para recuperación en versiones futuras. La cuenta incluye contraseña, estado, requisito de cambio de contraseña, roles y relaciones con sesiones y recuperaciones.

Las operaciones sobre contraseña, correo de acceso, roles, estado de cuenta y sesiones se consideran operaciones de seguridad. No deben tratarse como una edición común del perfil.

### Creación de usuarios

El sistema utilizará un único flujo de creación y primer acceso:

1. Owner/Admin crea el usuario con su correo y datos mínimos.
2. Geedyx valida que el correo no esté registrado y genera una contraseña temporal.
3. La contraseña temporal se muestra una sola vez al administrador.
4. El administrador entrega la contraseña temporal al usuario por un canal controlado.
5. El usuario inicia sesión con su correo y la contraseña temporal.
6. Geedyx obliga a cambiar la contraseña antes de permitir acceso normal.
7. La contraseña temporal se invalida y se crea la sesión normal.

La contraseña temporal debe tener expiración, no debe almacenarse en texto plano y no debe aparecer en registros de auditoría. Si se pierde o expira, un Owner/Admin autorizado podrá generar otra contraseña temporal.

### Sesiones y dispositivos

Cada sesión debe registrar usuario, identificador revocable, creación, última actividad, expiración absoluta, dispositivo/navegador, origen y estado.

Reglas iniciales:

- Máximo de 5 dispositivos o sesiones registradas por usuario.
- La cookie de sesión contiene únicamente un identificador opaco; el estado y la validez se controlan en el servidor.
- Expiración por 30 minutos de inactividad.
- Renovación server-side de `last_activity` mientras exista actividad válida.
- La cookie no se renueva en cada solicitud innecesariamente; puede renovarse de forma periódica mientras la sesión siga activa.
- Las solicitudes automáticas de la interfaz no deben mantener viva una sesión por sí solas; la renovación debe corresponder a actividad válida u operaciones reales del usuario.
- Expiración absoluta de 8 horas, equivalente a una jornada de oficina, para impedir que una sesión se extienda indefinidamente.
- Cierre de la sesión actual, cierre de todas y revocación individual remota.
- El cambio o restablecimiento de contraseña revoca las sesiones activas.
- Al superar cinco sesiones activas, las credenciales se validan pero no se crea una nueva sesión normal de inmediato.
- Después de la validación, la interfaz muestra un flujo restringido de administración de sesiones activas y permite revocar una o varias, incluida la opción de cerrar todas las demás.
- La nueva sesión solo se crea después de liberar un espacio; no se revoca automáticamente la sesión más antigua ni otra sesión activa.
- Las cookies deben utilizar HTTPS y atributos de seguridad como `HttpOnly`, `Secure` y `SameSite`.

La primera versión no incluirá la opción **Recordarme**. Todas las sesiones estarán sujetas a las mismas reglas de inactividad, expiración absoluta y revocación.

Cuando una sesión expire, la interfaz solicitará iniciar sesión nuevamente. No se restaurará la sesión vencida ni se implementará restauración automática de formularios desde autenticación.

### Protección CSRF

Como Geedyx utilizará autenticación basada en cookies, las operaciones que cambien información deberán incluir una protección CSRF validada en el servidor. Se utilizará la protección incorporada por el framework cuando exista; de lo contrario, se implementará un token CSRF para solicitudes de cambio de estado.

Las solicitudes `GET` no deben modificar datos. `SameSite` será una defensa adicional, pero no el único mecanismo de protección. Los fallos CSRF relevantes podrán registrarse en auditoría sin almacenar tokens.

### Recuperación de contraseña

La primera versión no integra proveedores de correo, SMS ni OTP. La recuperación utiliza una solicitud pendiente, autorización de Owner/Admin y un token temporal de un solo uso que se comparte manualmente por un canal externo.

1. El usuario solicita recuperación desde login.
2. Geedyx registra la solicitud con estado pendiente sin revelar si el correo existe.
3. Owner/Admin aprueba o rechaza la solicitud.
4. Solo después de la aprobación Geedyx genera el token seguro con expiración y lo muestra una sola vez al Owner/Admin que autorizó.
5. El Owner/Admin comparte el token con el usuario por un canal externo controlado.
6. El usuario introduce el token en la pantalla de recuperación y establece una nueva contraseña válida.
7. Al completar, el token se invalida, las sesiones se revocan y el evento se audita.

La primera versión no envía ni integra el canal externo: no habrá correo automático, SMS, OTP ni proveedor de mensajería. Un token rechazado, expirado o consumido nunca puede reutilizarse. Si se pierde, un Owner/Admin autorizado debe invalidarlo y generar otro; el token anterior queda inutilizable.

El token no debe almacenarse en texto plano ni aparecer completo en registros de aplicación o auditoría. La solicitud, su aprobación o rechazo, la generación sin exponer el secreto, el uso exitoso y la invalidación deben poder auditarse sin registrar el valor del token.

El formato inicial será de 6 caracteres alfanuméricos en mayúscula. Se excluirán caracteres visualmente ambiguos como `0/O`, `1/I` y `L`. El token tendrá una vigencia de 10 minutos y un máximo de 5 intentos inválidos; al superar ese límite se invalidará y será necesario generar otro. Para persistencia se utilizará una representación no reversible del token, nunca el valor original. La comparación se realizará de forma segura y el token se invalidará inmediatamente al consumirse.

### Perfil

El perfil representa la información personal y visible del usuario dentro de Geedyx. Incluye avatar, nombre, apellido, teléfono, cargo y nombre visible.

El identificador de acceso y el correo de login/recuperación pertenecen a la cuenta, aunque puedan mostrarse en el perfil. El cambio de correo requiere tratarse como una operación de seguridad y podrá requerir validación cuando exista integración de correo.

El estado de la cuenta, los roles y las sesiones no pertenecen al perfil.

### Preferencias individuales

Las preferencias son una responsabilidad separada del perfil. Incluyen idioma (`es`, `en` o heredar) y zona horaria (zona IANA o heredar). Se recomienda guardar `null` para representar herencia de la configuración global; así los cambios globales se aplican automáticamente a quienes no tengan una selección propia.

La moneda no es una preferencia individual: pertenece a la configuración global o a reglas financieras explícitas.

### Representación en la interfaz

La interfaz debe reflejar la separación entre cuenta, perfil, preferencias y administración. No se deben mezclar operaciones sensibles con la edición de información personal.

Para un usuario normal, el menú de usuario podrá organizarse conceptualmente así:

```text
Menú del usuario
├── Mi perfil
├── Preferencias
└── Seguridad
    ├── Cambiar contraseña
    └── Sesiones activas
```

La administración de usuarios, roles, permisos y auditoría debe estar en una sección administrativa para Owner/Admin, separada de `Mi perfil`.

Durante el primer acceso con una contraseña temporal, el usuario solo podrá completar el cambio obligatorio de contraseña. No tendrá acceso al dashboard ni a los módulos normales hasta finalizarlo.

### Roles y permisos

Geedyx utilizará autorización basada en roles (RBAC) con permisos atómicos. La relación será:

```text
Usuario -> uno o varios roles -> conjunto de permisos
```

Roles base del sistema:

- **Owner:** control total del sistema.
- **Admin:** administración delegada según permisos.
- **User:** acceso operativo limitado.

También se permitirán roles personalizados. Un usuario podrá tener uno o varios roles, y cada rol agrupará permisos expresados por recurso y acción.

La autorización técnica se centraliza en este módulo: define roles, permisos, asignaciones y validaciones. Cada módulo de Geedyx definirá y documentará sus propios permisos funcionales, sin trasladar sus reglas de negocio a `AUTH-USERS.md`.

Los permisos se registrarán en un catálogo central y utilizarán identificadores estables con una estructura como `modulo.recurso.accion`. Los módulos serán responsables de declarar sus permisos; la administración de roles podrá combinarlos entre módulos.

En el primer lanzamiento los permisos se asignarán a roles, no directamente a usuarios. La ausencia de un permiso significa acceso denegado y no se utilizarán reglas de negación explícita inicialmente.

La validación debe ejecutarse en el servidor. Una cuenta desactivada o bloqueada no puede iniciar sesión y un usuario no puede elevar sus propios privilegios.

El catálogo debe distinguir, cuando aplique, permisos de lectura, creación, modificación, aprobación, cancelación, devolución y otras acciones sensibles. Ocultar una opción en la interfaz nunca sustituye la validación server-side.

El primer Owner se crea mediante la instalación inicial. Después de completar
la instalación pueden existir varios Owners. Solo un Owner activo puede crear
otro Owner o asignar ese rol a un usuario activo. Un Admin, incluso con
`roles.manage`, no puede elevar a un usuario al rol `Owner`.

El rol `Owner` es protegido y no se administra como un rol personalizado. La
creación, promoción, degradación o desactivación de un Owner requiere
confirmación explícita, reautenticación y motivo obligatorio. Siempre debe
existir al menos un Owner activo; el último Owner no puede desactivarse,
bloquearse ni perder sus privilegios.

El catálogo mínimo inicial de permisos será:

```text
dashboard.read
configuration.read
configuration.update
configuration.reset
users.read
users.manage
roles.manage
sessions.read
sessions.revoke
products.read
products.manage
products.prices.manage
inventory.read
inventory.receive
inventory.adjust
inventory.threshold.update
customers.read
customers.manage
suppliers.read
suppliers.manage
sales.read
sales.create
sales.cancel
sales.return
payments.read
payments.confirm
reports.read
audit.read
system_health.read
```

Los módulos declaran el significado de sus permisos en su propio documento.
No se utilizará un permiso genérico `delete` en la primera versión. Los
registros operativos se archivarán, inactivarán, cancelarán o devolverán según
corresponda. Una eliminación física controlada solo podrá contemplarse para
datos sin historial ni referencias, como borradores no utilizados o archivos
multimedia sin relación.

### Auditoría

Autenticación y usuarios deben emitir eventos de seguridad y administración relacionados con su propio dominio: inicio de sesión exitoso/fallido, cierre, expiración y revocación de sesiones, cambios de usuarios, contraseñas, recuperación y roles/permisos.

La auditoría general es una capacidad transversal documentada en `AUDIT.md`. Este módulo no define la consulta, retención ni administración global de todos los eventos de Geedyx. Nunca se deben registrar contraseñas, tokens completos ni secretos.

## 4. Flujos principales

### Primer acceso

```text
Owner/Admin crea usuario
  -> cuenta ACTIVE y contraseña temporal
  -> password_change_required = true
  -> login correcto
  -> cambio obligatorio de contraseña
  -> sesión normal y acceso al panel
```

Mientras el cambio sea obligatorio, no se permite navegar por los módulos normales.

### Login normal

```text
Credenciales -> validar cuenta y contraseña
  -> si está inactiva/bloqueada: rechazar
  -> si requiere cambio: dirigir al cambio
  -> si no: crear sesión autenticada
```

Los errores no deben revelar si existe un usuario concreto.

### Sesión

```text
Solicitud -> validar sesión vigente
  -> inactiva o vencida: solicitar login
  -> vigente: actualizar actividad y continuar
```

La renovación no debe extender la sesión más allá de su vida máxima absoluta.

### Recuperación

```text
Usuario solicita recuperación desde login
  -> solicitud pendiente, sin revelar si el correo existe
  -> Owner/Admin aprueba o rechaza
  -> si aprueba: token temporal mostrado una sola vez al autorizador
  -> autorizador comparte el token por canal externo
  -> usuario introduce el token y define nueva contraseña
  -> token consumido, sesiones revocadas y evento auditado
```

La recuperación no debe permitir acceso al sistema antes de completar el cambio de contraseña. El canal externo queda fuera de Geedyx durante la primera versión y la aplicación solo controla la emisión, expiración, validación e invalidación del token.

### Cambio dentro del sistema

El usuario autenticado puede cambiar su contraseña sin autorización administrativa, verificando la contraseña actual y una nueva válida. Se recomienda revocar las demás sesiones.

Las contraseñas definitivas no expiran automáticamente en la primera versión. El cambio será obligatorio en el primer acceso cuando corresponda, después de una recuperación o cuando un Owner/Admin lo exija mediante una acción administrativa. Las contraseñas temporales sí deben expirar.

## 5. Modelo conceptual

Entidades sugeridas: `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `Session`, `PasswordResetRequest`, `UserPreference`, `SystemSetting` y `AuditEvent`. La cuenta, el perfil y las preferencias son separaciones conceptuales aunque inicialmente puedan persistirse bajo una misma entidad de usuario.

Campos relevantes de `User`: `status`, `password_change_required`, `email` (único), `first_name`, `last_name`, `avatar`, `phone`, `job_title`, `created_at`, `updated_at`.

Preferencias:

```text
language = null | es | en
timezone = null | IANA timezone
```

## 6. Decisiones tomadas

1. Autenticación, sesiones, recuperación, perfil, preferencias, configuración y autorización son áreas separadas.
2. Owner crea usuarios; Admin solo si cuenta con el permiso.
3. El primer inicio puede exigir cambio de contraseña antes del acceso normal.
4. La recuperación exige una solicitud, aprobación administrativa, token temporal de un solo uso y entrega manual por un canal externo.
5. El límite inicial es de cinco dispositivos/sesiones.
6. Se admiten cierre individual, cierre total y revocación remota.
7. Actividad válida renueva la sesión, con límites de inactividad y vida máxima.
8. Cambio/restablecimiento de contraseña revoca sesiones.
9. Idioma y zona horaria pueden heredar valores definidos por Configuración general mediante `null`.
10. La moneda no es una preferencia personal; su definición pertenece a Configuración general o a reglas financieras.
11. La autorización utiliza RBAC con permisos atómicos.
12. Un usuario puede tener uno o varios roles, incluidos roles personalizados.
13. Los permisos pertenecen a roles; no se asignan directamente a usuarios en el primer lanzamiento.
14. Cada módulo declara sus permisos funcionales y AUTH-USERS centraliza su administración y validación.
15. Cuenta, perfil y preferencias son responsabilidades separadas dentro del dominio de usuarios.
16. El correo es el único identificador de acceso y debe ser único.
17. La primera versión no integra proveedores de correo, SMS ni OTP.
18. Geedyx genera la contraseña temporal y el administrador la entrega al usuario.
19. El primer acceso exige cambiar la contraseña antes del acceso normal.
20. Se auditan eventos relevantes sin almacenar secretos.
21. La entrega automática mediante correo, SMS, OTP o cualquier proveedor externo queda como extensión futura.
22. La interfaz debe separar visual y funcionalmente cuenta, perfil, preferencias y administración.
23. En una instalación nueva, el primer Owner se crea mediante el flujo de instalación inicial.
24. Después de 5 intentos consecutivos fallidos la cuenta queda bloqueada durante 15 minutos, sin revelar el bloqueo en el mensaje de login.
25. Los mensajes de login no revelan si un correo existe o cuál validación falló.
26. La sesión expira después de 30 minutos de inactividad y se renueva server-side con actividad válida, sin superar una expiración absoluta de 8 horas.
27. La primera versión no incluye la opción Recordarme ni sesiones persistentes entre aperturas del navegador.
28. Las solicitudes que cambian datos deben contar con protección CSRF validada en el servidor.
29. La instalación crea exactamente un primer Owner.
30. Después de la instalación pueden existir varios Owners.
31. Solo un Owner activo puede asignar el rol `Owner`.
32. El último Owner activo no puede desactivarse, bloquearse ni perder sus privilegios.
33. Los cambios sobre Owners requieren reautenticación, motivo y auditoría.
34. El token de recuperación tiene 6 caracteres alfanuméricos en mayúscula, vigencia de 10 minutos y máximo de 5 intentos inválidos.
35. Un token expirado, consumido, perdido o bloqueado debe invalidarse y reemplazarse por uno nuevo.
36. Las contraseñas definitivas no expiran automáticamente en la primera versión.
37. Al alcanzar cinco sesiones activas se debe revocar una sesión existente antes de crear otra, sin desconexión automática de dispositivos.
38. La auditoría no tendrá eliminación ni purga automática en la primera versión.
39. Las contraseñas requieren mínimo 8 caracteres, una mayúscula, un número y un carácter especial.
40. Las contraseñas se almacenan con Argon2id y un `salt` único por contraseña; no se guardan en texto plano ni se registran en auditoría.
41. Los parámetros iniciales de Argon2id son versión 19, `memoryCost` de 19 MiB, `timeCost` 2, `parallelism` 1 y `hashLength` de 32 bytes.
42. Los tokens de recuperación se almacenan mediante hash seguro o HMAC, nunca mediante su valor original.
43. El bloqueo automático se libera después de 15 minutos o antes mediante desbloqueo autorizado y auditado.
44. El rate limit se aplica por cuenta, origen y operación; los excesos no revelan si la cuenta existe.
45. Los permisos se validan en el servidor, se deniegan por defecto y se asignan a roles, no directamente a usuarios.

## 7. Pendientes técnicos

- Implementación concreta de la biblioteca criptográfica y ajuste de límites secundarios de rate limit.
- Catálogo y matriz de permisos de cada módulo, definidos durante la planificación de cada módulo.
- Protección adicional y exportación de auditoría para versiones futuras.
- Canal externo y proveedor de entrega automática, si se incorporan en una versión futura.

## 8. Criterios de aceptación

- Owner puede crear un usuario que debe cambiar contraseña en el primer acceso.
- El correo no puede duplicarse y es el único identificador de acceso.
- El administrador recibe la contraseña temporal una sola vez y debe entregarla al usuario.
- La contraseña temporal no permite acceso normal y se invalida después del cambio.
- La edición del perfil no expone operaciones de roles, permisos, estado de cuenta o sesiones.
- El primer acceso restringe la navegación hasta completar el cambio de contraseña.
- Cuentas inactivas o bloqueadas no inician sesión.
- Cinco intentos consecutivos fallidos bloquean temporalmente la cuenta durante 15 minutos.
- El bloqueo temporal se libera automáticamente al cumplirse el plazo o antes mediante una acción autorizada y auditada.
- El login mantiene un mensaje genérico y no revela la existencia, estado ni tiempo restante de una cuenta.
- Sesiones inactivas o vencidas dejan de operar.
- La actividad válida renueva la sesión sin superar la vida máxima absoluta.
- Logout invalida la sesión en el servidor y elimina la cookie del navegador.
- Las solicitudes automáticas no mantienen viva una sesión sin actividad válida.
- Una sesión expirada requiere un nuevo login y no se restaura automáticamente.
- Al alcanzar cinco sesiones activas, el usuario debe revocar una existente antes de crear otra y ninguna sesión se revoca automáticamente.
- Las solicitudes que modifican datos sin protección CSRF válida son rechazadas.
- Usuario puede consultar y cerrar sesiones.
- Recuperación registra la solicitud sin revelar si el correo existe y requiere aprobación de Owner/Admin antes del cambio.
- El token se genera después de la aprobación, se muestra una sola vez al autorizador y se comparte manualmente por un canal externo.
- Token de 6 caracteres alfanuméricos en mayúscula expira después de 10 minutos, permite hasta 5 intentos inválidos, es de un solo uso, nunca se registra completo y revoca sesiones al completarse.
- Las contraseñas definitivas no expiran automáticamente en la primera versión.
- Las contraseñas cumplen la longitud y composición mínimas y se almacenan mediante Argon2id con `salt` único.
- La verificación de contraseñas utiliza los parámetros iniciales definidos para Argon2id.
- Las contraseñas y tokens no aparecen en respuestas, logs ni auditoría.
- El rate limit controla login, recuperación y validación de tokens por cuenta, origen y operación, y utiliza `429 Too Many Requests` cuando corresponde.
- Preferencias `null` heredan correctamente la configuración global.
- La moneda no cambia por preferencias personales.
- Los roles agrupan permisos y pueden combinar permisos de distintos módulos.
- Los módulos pueden declarar sus permisos sin trasladar sus reglas de negocio a AUTH-USERS.
- La falta de un permiso produce acceso denegado y la validación ocurre en el servidor.
- Editar el perfil no modifica directamente credenciales, roles, estado de cuenta ni sesiones.
- Acciones sensibles quedan auditadas sin exponer secretos.
