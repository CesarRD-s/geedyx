# Geedyx — Flujo de desarrollo por módulo

Este flujo convierte la documentación funcional en incrementos verificables. La documentación original de Geedyx permanece como fuente de alcance; este archivo define cómo se implementa y cómo se decide que un módulo está terminado.

Todo código nuevo debe escribirse formateado y de manera vertical y legible. Las reglas permanentes están en `AGENTS.md`.

## Estados

- `PENDIENTE`: todavía no se ha iniciado.
- `DEFINICIÓN`: se están cerrando flujos, reglas, datos, permisos y pendientes.
- `IMPLEMENTACIÓN`: existe trabajo activo en API, base de datos o Web.
- `VALIDACIÓN`: el módulo está funcional y se ejecutan las comprobaciones de cierre.
- `COMPLETADO`: todas las puertas de calidad están satisfechas.
- `BLOQUEADO`: existe una decisión o dependencia externa que impide avanzar; el bloqueo debe quedar escrito.

## Ciclo obligatorio

1. Leer el documento funcional del módulo y sus dependencias.
2. Registrar decisiones, límites y preguntas abiertas antes de codificar.
3. Definir entidades, estados, permisos, rutas HTTP, respuestas y eventos de auditoría.
4. Implementar un flujo vertical pequeño: migración, API, validación, UI y prueba.
5. Validar la API con pruebas unitarias y de integración/e2e cuando dependa de PostgreSQL.
6. Validar la Web en estados de carga, vacío, error, éxito, no autorizado y responsive.
7. Recorrer visualmente el módulo como usuario real y validar sus flujos principales.
8. Ejecutar `pnpm validate` y documentar la evidencia.
9. Marcar el módulo como `COMPLETADO` solo cuando no queden criterios de aceptación abiertos.

## Puertas de cierre

### Contrato y dominio

- El comportamiento implementado coincide con el `.md` del módulo.
- Las reglas críticas se validan en NestJS, no solo en la interfaz.
- Los cambios de datos relevantes son transaccionales e idempotentes cuando aplica.
- Las fechas y horas respetan UTC persistido y zona horaria operativa.

### Seguridad y trazabilidad

- El permiso se valida en el servidor.
- Las acciones sensibles generan auditoría sin secretos.
- Los errores externos usan Problem Details y `requestId`.
- No se agregan tokens, credenciales o datos de negocio sensibles a `localStorage`.

### UI

- Se usan los tokens, primitives y patrones de `UI-FRONTEND.md`.
- Existen estados de carga, vacío, error recuperable, éxito y deshabilitado.
- Los formularios tienen labels visibles, errores inline y accesibilidad de teclado.
- La vista inicia respetando System, permite alternar entre Light y Dark y
  funciona también en viewport reducido.
- Los errores de formulario se muestran como texto, sin fondo, caja ni borde rojo.
- Los campos muestran un `focus` visible con su borde normal de 1 px y un ring
  externo de 2 px, sin cambiar el tamaño del campo.

### Dependencias Web acordadas

- `fetch` se mantiene como transporte HTTP mediante un cliente API centralizado.
- `@tanstack/react-query` administra cache, revalidación y estado remoto.
- `react-hook-form`, `zod` y `@hookform/resolvers` administran formularios y
  validación de interfaz.
- `date-fns` administra presentación y operaciones de fechas.
- `clsx` se utiliza mediante `src/lib/cn.ts` para componer clases Tailwind.
  Las clases deben escribirse en arreglos verticales agrupados por
  responsabilidad visual, no como una utilidad por línea ni como cadenas
  horizontales extensas.
- TanStack Table y una librería UI quedan diferidos hasta que un módulo demuestre
  que los necesita.
- No se agrega Axios, Redux o Zustand sin un problema concreto que lo justifique.

### Aceptación visual como usuario

- El flujo se puede completar desde la interfaz sin depender de acciones manuales de desarrollo.
- Las rutas, botones, formularios, mensajes y redirecciones corresponden al comportamiento funcional definido.
- La experiencia se revisa con datos reales de prueba y con los errores esperados.
- Se valida el recorrido completo desde el punto de vista del usuario, no solo que la interfaz compile.
- Cualquier diferencia visual o funcional pendiente mantiene el módulo en `VALIDACIÓN`.

### Validación

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Pruebas de base de datos aisladas para migraciones y e2e cuando el módulo escriba datos.

## Convención de entrega

Cada módulo debe actualizar:

1. Su estado en `MODULE-STATUS.md`.
2. La decisión técnica correspondiente, si introduce una nueva dependencia o patrón.
3. Sus pruebas y criterios de aceptación.
4. La documentación funcional solo cuando una decisión acordada cambie el alcance.
