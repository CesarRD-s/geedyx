# Geedyx — Configuración general

## 1. Propósito y alcance

Este documento define únicamente los valores globales del sistema Geedyx para
un solo negocio. Inicialmente, Geedyx funcionará como una instalación para una
sola operación; no se contemplan organizaciones, tenants, sucursales ni
estructuras empresariales complejas.

La configuración general se mantiene separada de:

- `AUTH-USERS.md`: autenticación, sesiones, seguridad, roles y permisos.
- Preferencias de usuario: idioma y zona horaria personales.
- Configuración de módulos: cada módulo define sus propios parámetros en su documento.
- Configuración técnica: entorno de ejecución y variables técnicas.

## 2. Identidad del negocio

El negocio podrá definir:

- Nombre del negocio o empresa.
- Logo opcional.
- Nombre legal opcional, reservado para documentos futuros.

No se incluyen organizaciones, tenants, sucursales ni otras estructuras empresariales.

## 3. Regionalización global

El sistema podrá definir los siguientes valores globales:

- País o región.
- Idioma predeterminado: Español (`es`).
- Zona horaria predeterminada.
- Moneda principal.
- Formato de fecha inicial, limitado a:
  - `DD/MM/YYYY`
  - `MM/DD/YYYY`
  - `YYYY-MM-DD`
- Formato de hora:
  - 12 horas con `AM`/`PM`.
  - 24 horas sin `AM`/`PM`.

No se incluyen formatos numéricos avanzados, segundos visibles ni configuraciones regionales complejas.

## 4. Relación con las preferencias de usuario

El usuario puede sobrescribir únicamente el idioma y la zona horaria globales. Si la preferencia individual correspondiente es `null`, se utiliza el valor global.

La moneda es global y no puede cambiarse por usuario. Inicialmente, el formato
global de fecha y hora se utiliza para todo el sistema; no se contemplan
preferencias individuales para esos formatos.

Las pantallas de configuración y preferencias son funcionales: cada cambio
aceptado debe persistirse mediante el API, actualizar la configuración efectiva
de la sesión y verse reflejado en las pantallas que consumen el idioma o la zona
horaria. Una vista provisional del menú no satisface este contrato.

## 5. Estado inicial de configuración

La creación del Owner completa la instalación, pero no implica que la
configuración general ya esté completa. Después del primer login, el sistema
puede encontrarse con la configuración pendiente.

Los valores obligatorios son:

- Nombre del negocio o empresa.
- País o región.
- Zona horaria.
- Moneda principal.
- Formato de fecha.
- Formato de hora.
- Idioma predeterminado.

Los valores iniciales son:

- Idioma: Español (`es`).
- Formato de fecha: `DD/MM/YYYY`.
- Formato de hora: 24 horas sin `AM`/`PM`.

El país o región, la zona horaria y la moneda principal deben ser elegidos por
el Owner. No se establecerá un valor automático que pueda ser incorrecto para
el negocio.

El logo y el nombre legal no son obligatorios y nunca bloquean la operación.

Mientras falte algún valor obligatorio:

- El sistema permanece accesible después del login.
- El Panel operativo muestra una alerta persistente de configuración pendiente.
- Se pueden administrar usuarios, productos, clientes e inventario.
- No se pueden completar ventas ni generar comprobantes mientras no exista una
  moneda principal válida.
- La configuración pendiente no reabre ni modifica la instalación.

La interfaz puede utilizar una referencia temporal del entorno del usuario
para mostrar la hora mientras falte la zona horaria global. Esa referencia es
solo visual y no se utiliza para auditoría, reportes ni operaciones. Una vez
configurada la zona horaria global, se aplican las reglas normales del header.

## 6. Fecha y hora en el header de la consola

El header de la consola mostrará la fecha y hora actuales. Cuando la
configuración esté completa, debe:

- Usar la zona horaria personal del usuario si existe; de lo contrario, la zona horaria global.
- Aplicar el formato global de fecha y hora configurado.

El reloj visual del cliente no cuenta como actividad válida para renovar la sesión. La fecha y hora almacenadas para auditoría y operaciones deben conservar una referencia consistente; el formato visual no modifica el valor almacenado.

La zona horaria global del negocio es la referencia operativa para ventas del
día, períodos de reportes, indicadores del Panel operativo, comprobantes,
movimientos de inventario, auditoría y agrupaciones por fecha. La zona horaria
personal solo adapta la visualización del usuario y no modifica esos
resultados.

## 7. Administración, validación y auditoría

- Solo un Owner o un Admin con permiso puede modificar la configuración.
- La consulta utiliza `configuration.read`.
- La modificación utiliza `configuration.update`.
- La restauración utiliza `configuration.reset`.
- Los valores obligatorios deben validarse en el servidor.
- No se permiten valores globales inválidos o vacíos.
- Los cambios relevantes deben registrarse en `AUDIT.md`.
- La restauración de valores predeterminados puede contemplarse como operación administrativa.

## 8. Fuera del alcance inicial

Quedan fuera de este documento:

- Multimoneda.
- Organizaciones, tenants o sucursales.
- Integraciones externas.
- Proveedores de correo.
- Reglas fiscales.
- Configuraciones específicas de Ventas, Inventario, Compras u otros módulos.
- Parámetros técnicos, secretos, puertos, PostgreSQL o variables de entorno.
- Preferencias individuales de formato de fecha y hora.
- Configuración avanzada de formatos.
