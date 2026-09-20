# GEEDYX Frontend UI System

Especificación autónoma de la interfaz visual de GEEDYX. Este documento
define la identidad, los tokens, las reglas de composición, los componentes,
los estados, la accesibilidad y las tecnologías necesarias para construir el
frontend sin depender de otra documentación.

La interfaz es una consola administrativa interna: seria, precisa, compacta,
legible y orientada a tareas. La estructura y la tipografía aportan el peso
visual. La decoración es secundaria y solo existe cuando comunica algo.

## 1. Principios de diseño

- Jerarquía de información clara.
- Densidad funcional, especialmente en el panel administrativo.
- Navegación compacta y predecible.
- Tablas, filtros, búsqueda y acciones útiles.
- Una acción principal clara por contexto.
- Superficies sobrias y separación mediante spacing, color y bordes.
- Contraste legible en Light, Dark y System.
- Responsive sin sacrificar legibilidad ni operaciones importantes.
- Feedback explícito para loading, success, error, empty y disabled.
- Accesibilidad por teclado, focus visible y nombres accesibles.

### No usar

- Gradientes, glassmorphism o fondos decorativos.
- Estética genérica de dashboard generado por IA.
- Tarjetas enormes para métricas simples.
- Exceso de tarjetas, bordes, sombras o esquinas redondeadas.
- Animaciones decorativas, parallax, count-up o elementos flotantes.
- Iconos usados como relleno o junto a cada etiqueta.
- Colores escritos directamente en componentes.
- Una librería visual genérica que reemplace la identidad GEEDYX.

## 2. Identidad visual

- El nombre se escribe siempre `GEEDYX`, en mayúsculas.
- Logo y wordmark son monocromáticos.
- El logo usa el color de texto principal y nunca usa el accent.
- El wordmark oficial se usa cuando el espacio y el contexto lo permiten.
- La marca debe funcionar igual en Light y Dark.
- No usar emojis en la identidad ni como sustituto de iconos.
- Los assets de marca se presentan en versión clara u oscura según el tema.
- El icon mark debe ser reconocible en tamaños compactos.

La marca no cambia de color cuando cambia el accent. El accent pertenece a la
interacción, no a la identidad.

## 3. Tecnologías y librerías

### Dependencias activas

| Tecnología | Versión | Responsabilidad |
| --- | --- | --- |
| Next.js | `16.3.4` | App Router, layouts, routing y server components. |
| React | `19.2.8` | Componentes, composición, estado y eventos. |
| React DOM | `19.2.8` | Renderizado web. |
| TypeScript | `5` | Tipado estricto. |
| Tailwind CSS | `4` | Layout, responsive, estados, spacing y utilities. |
| `@tailwindcss/postcss` | `^4` | Integración de Tailwind con PostCSS. |
| `lucide-react` | `^1.43.0` | Iconografía completa de la interfaz. |
| `next-themes` | `^0.4.6` | Light, Dark, System y persistencia del tema. |
| ESLint | `9` | Reglas de calidad del código. |
| `eslint-config-next` | `16.3.4` | Reglas específicas de Next.js. |

### Dependencias que no deben agregarse sin una razón concreta

No se utiliza un UI kit genérico, una librería de animación ni otra familia de
iconos. React Hook Form + Zod son opciones para formularios futuros que tengan
validación compleja. TanStack Query es una opción futura para cache e
invalidación coordinada. Ninguna de las dos opciones forma parte de las
dependencias activas por defecto.

## 4. Arquitectura visual del frontend

La UI se compone de cuatro niveles:

1. **Tokens**: colores, tipografía, spacing, radius, sombras y motion.
2. **Primitives**: botones, campos, dialogs, badges, estados y controles.
3. **Patrones**: shell, page header, toolbar, tablas, formularios y dialogs de
   confirmación.
4. **Pantallas**: login, setup, workspace, productos, categorías, usuarios,
   auditoría, compañía, perfil, preferencias y seguridad.

Las primitives son la única fuente permitida para los controles recurrentes.
Una pantalla nueva debe componerlas, no crear estilos paralelos.

## 5. Paleta y tokens semánticos

Los tokens se implementan como variables CSS y se exponen como utilities de
Tailwind. Los componentes consumen el nombre semántico, no un color raw.

### Superficies

| Variable | Utility | Light | Dark | Uso |
| --- | --- | --- | --- | --- |
| `--background` | `bg-background` | `#fafafa` | `#101114` | Fondo de página. |
| `--surface` | `bg-surface` | `#ffffff` | `#18191c` | Cards, tablas, dialogs, header y sidebar. |
| `--surface-subtle` | `bg-surface-subtle` | `#f4f4f5` | `#202226` | Hover, rellenos suaves y skeletons. |
| `--surface-raised` | `bg-surface-raised` | `#ffffff` | `#282a2f` | Elementos sobre una surface normal. |

### Texto

| Variable | Utility | Light | Dark | Uso |
| --- | --- | --- | --- | --- |
| `--text` | `text-foreground` | `#18181b` | `#f4f4f5` | Texto principal y títulos. |
| `--text-secondary` | `text-secondary` | `#52525b` | `#d4d4d8` | Texto secundario. |
| `--text-muted` | `text-muted` | `#71717a` | `#a1a1aa` | Labels, metadata y placeholders. |

### Bordes

| Variable | Utility | Light | Dark | Uso |
| --- | --- | --- | --- | --- |
| `--border` | `border-border` | `#e4e4e7` | `#2b2d32` | Filas, divisores y límites sutiles. |
| `--border-strong` | `border-border-strong` | `#d4d4d8` | `#454850` | Inputs, outlines y marcos destacados. |

### Accent configurable

El accent se reserva para acción, selección, links, focus, progreso e
indicadores. El valor predeterminado es azul.

| Variable | Utility | Light | Dark | Uso |
| --- | --- | --- | --- | --- |
| `--accent` | `bg-accent`, `text-accent` | `#2563eb` | `#3b82f6` | Acción principal, links y selección. |
| `--accent-hover` | `hover:bg-accent-hover` | `#1d4ed8` | `#2563eb` | Hover de acción primary. |
| `--accent-active` | `active:bg-accent-active` | `#1e40af` | `#1d4ed8` | Acción presionada. |
| `--accent-foreground` | `text-accent-foreground` | `#ffffff` | `#ffffff` | Texto sobre accent. |
| `--accent-muted` | `bg-accent-muted` | `#eff6ff` | `rgb(59 130 246 / .14)` | Selección y navegación activa. |

### Familias accent disponibles

El atributo `data-accent` en `<html>` acepta `blue`, `indigo`, `emerald`,
`violet`, `rose`, `sky`, `cyan`, `teal`, `amber` y `orange`. Todos los valores
se deben definir para Light y Dark.

| Familia | Light accent | Light hover | Light active | Dark accent | Dark hover | Dark active |
| --- | --- | --- | --- | --- | --- | --- |
| blue | `#2563eb` | `#1d4ed8` | `#1e40af` | `#3b82f6` | `#2563eb` | `#1d4ed8` |
| indigo | `#4f46e5` | `#4338ca` | `#3730a3` | `#6366f1` | `#4f46e5` | `#4338ca` |
| emerald | `#059669` | `#047857` | `#065f46` | `#34d399` | `#10b981` | `#059669` |
| violet | `#7c3aed` | `#6d28d9` | `#5b21b6` | `#a78bfa` | `#8b5cf6` | `#7c3aed` |
| rose | `#e11d48` | `#be123c` | `#9f1239` | `#fb7185` | `#f43f5e` | `#e11d48` |
| sky | `#0284c7` | `#0369a1` | `#075985` | `#38bdf8` | `#0ea5e9` | `#0284c7` |
| cyan | `#0891b2` | `#0e7490` | `#155e75` | `#22d3ee` | `#06b6d4` | `#0891b2` |
| teal | `#0d9488` | `#0f766e` | `#115e59` | `#2dd4bf` | `#14b8a6` | `#0d9488` |
| amber | `#b45309` | `#92400e` | `#78350f` | `#fbbf24` | `#f59e0b` | `#d97706` |
| orange | `#c2410c` | `#9a3412` | `#7c2d12` | `#fb923c` | `#f97316` | `#ea580c` |

| Familia | Light muted | Dark muted | Dark foreground |
| --- | --- | --- | --- |
| blue | `#eff6ff` | `rgb(59 130 246 / .14)` | `#ffffff` |
| indigo | `#eef2ff` | `rgb(99 102 241 / .16)` | `#ffffff` |
| emerald | `#ecfdf5` | `rgb(52 211 153 / .15)` | `#06281d` |
| violet | `#f5f3ff` | `rgb(167 139 250 / .16)` | `#1e103f` |
| rose | `#fff1f2` | `rgb(251 113 133 / .16)` | `#4c0519` |
| sky | `#f0f9ff` | `rgb(56 189 248 / .16)` | `#082f49` |
| cyan | `#ecfeff` | `rgb(34 211 238 / .15)` | `#083344` |
| teal | `#f0fdfa` | `rgb(45 212 191 / .15)` | `#042f2e` |
| amber | `#fffbeb` | `rgb(251 191 36 / .16)` | `#451a03` |
| orange | `#fff7ed` | `rgb(251 146 60 / .16)` | `#431407` |

El accent nunca se usa como fondo general del sidebar, header, una sección
completa o una tarjeta grande. Las familias accent tampoco reemplazan los
tokens semánticos de `success`, `warning`, `danger` o `info`.

### Estados semánticos

| Variable | Utility | Light | Dark | Significado |
| --- | --- | --- | --- | --- |
| `--success` | `bg-success` | `#16a34a` | `#22c55e` | Operación exitosa o disponible. |
| `--success-strong` | `text-success-strong` | `#15803d` | `#4ade80` | Texto success con contraste. |
| `--warning` | `bg-warning` | `#f59e0b` | `#f59e0b` | Atención o stock bajo. |
| `--warning-strong` | `text-warning-strong` | `#b45309` | `#fbbf24` | Texto warning con contraste. |
| `--danger` | `bg-danger` | `#dc2626` | `#ef4444` | Error, eliminación o fuera de stock. |
| `--danger-strong` | `text-danger-strong` | `#b91c1c` | `#f87171` | Texto danger con contraste. |
| `--info` | `bg-info` | `#2563eb` | `#60a5fa` | Información contextual. |
| `--info-strong` | `text-info-strong` | `#1d4ed8` | `#93c5fd` | Texto info con contraste. |

El estado nunca depende únicamente del color. Se debe mostrar una etiqueta y,
cuando aporte información, un icono semántico.

### Tokens auxiliares

| Variable | Utility o uso | Light | Dark |
| --- | --- | --- | --- |
| `--overlay` | `bg-overlay`, backdrop | `rgba(15, 23, 42, .5)` | `rgb(0 0 0 / .62)` |
| `--input` | `bg-input` | `#ffffff` | `#141d2e` |
| `--selection` | selección nativa | `#dbeafe` | `rgb(59 130 246 / .35)` |
| `--shadow-panel` | `shadow-panel`, elementos flotantes | `0 10px 25px -5px rgb(15 23 42 / .15), 0 4px 8px -4px rgb(15 23 42 / .1)` | `0 10px 25px -5px rgb(2 6 23 / .5), 0 4px 8px -4px rgb(2 6 23 / .4)` |

## 6. Temas

La UI ofrece Light, Dark y System.

- `next-themes` usa `attribute="class"`, `defaultTheme="system"` y
  `enableSystem`.
- El tema se aplica mediante `.dark` en `<html>`.
- `html` usa `color-scheme: light` y `html.dark` usa `color-scheme: dark`.
- El cambio de tema usa `ThemeToggle`, un botón de icono discreto.
- Se utiliza un guard de montaje para evitar diferencias entre servidor y
  cliente.
- `<html>` usa `suppressHydrationWarning`.
- Los componentes no deben crear excepciones `dark:` para corregir colores.
- Si una variante de tema es necesaria, se modifica el token global.

## 7. Tipografía

### Familias

- **Source Sans 3**: familia principal de interfaz, variable, pesos 300, 400,
  500, 600 y 700.
- **Geist Mono**: únicamente para SKU, slug, IDs y valores que necesiten
  alineación tabular.

Source Sans 3 se expone como `--font-source` y `--font-sans`. Geist Mono se
expone como `--font-geist-mono` y `--font-mono`.

### Escala

| Uso | Clases recomendadas |
| --- | --- |
| Título de página pública | `text-2xl font-semibold text-foreground` |
| Título de página administrativa | `text-xl font-semibold text-foreground` |
| Encabezado de sección | `text-sm font-medium text-foreground` |
| Texto principal | `text-sm text-foreground` |
| Texto secundario | `text-sm text-secondary` |
| Label o helper | `text-sm` o `text-xs text-muted` |
| Caption o header de tabla | `text-xs uppercase tracking-wide text-muted` |
| Texto de tabla | `text-sm` |
| Valores monetarios | cualquier tamaño con `tabular-nums` |

La jerarquía se construye con tamaño, peso, contraste, spacing y posición. No
se usan pesos o colores arbitrariamente.

## 8. Spacing y geometría

La base es un grid de 4 px: 4, 8, 12, 16, 24, 32 y 48 px. Se usa la escala
normal de Tailwind.

| Contexto | Regla |
| --- | --- |
| Página administrativa | `flex-1 p-4 sm:p-6` |
| Contenido centrado | `max-w-6xl mx-auto` |
| Padding de contenido público | `px-4 py-6 sm:px-6` |
| Bloques de una sección | `space-y-4` |
| Bloques principales | `space-y-6` |
| Formulario | `space-y-4` |
| Separación después de introducción | `mt-6` |
| Celdas de tabla | `px-4 py-2.5` |
| Header y footer de dialog | `px-5 py-3` |
| Contenido de dialog | `px-5 py-4` |
| Card | `p-4` |
| Link de navegación | `px-3 py-2` |
| Lista de navegación | `space-y-1` |
| Navegación interna | `py-4` |

No crear valores arbitrarios como `p-[13px]`, `gap-[7px]`, `p-7` o `gap-7` si
la escala existente resuelve el problema.

### Radius

| Token | Valor | Uso |
| --- | --- | --- |
| `--radius-md` | `4px` | Inputs, selects, tablas, controles y navegación. |
| `--radius-lg` | `8px` | Dialogs y paneles agrupados grandes. |
| `--radius-full` | `9999px` | Pills, badges, dots, avatars y botones circulares. |

Utilities permitidas: `rounded-md`, `rounded-lg` y `rounded-full` según el
caso. No usar `rounded-3xl`, `rounded-[20px]` ni radius arbitrario.

### Bordes y sombras

- `border-border`: filas, divisores y límites sutiles.
- `border-border-strong`: inputs, outlines, focus-worthy edges y drop zones.
- No bordear todos los elementos; primero usar superficie y spacing.
- `shadow-panel` solo para dialogs, dropdowns, popovers, drawers, menús
  flotantes y tarjeta de login.
- Cards y tablas normales usan surface + border + spacing.

## 9. Iconografía

La única familia de iconos es `lucide-react`.

Usos válidos: navegación, búsqueda, filtros, menú móvil, cerrar dialogs,
editar, eliminar, ordenar, disponibilidad, tema y acciones compactas.

Reglas:

- Tamaño estándar: `h-4 w-4`.
- SVG decorativo o redundante: `aria-hidden="true"`.
- Un icono no reemplaza un label cuando la acción necesita explicación.
- No usar iconos para decorar cada sección o rellenar espacios.
- No usar clipart como identidad.

Los botones de solo icono usan un componente con `aria-label` obligatorio,
`title` cuando el contexto no basta, estados hover, focus-visible y disabled
consistentes, y tone danger para acciones destructivas.

## 10. Componentes base

| Componente | Responsabilidad |
| --- | --- |
| `Button` | `primary`, `secondary`, `ghost`, `danger`; tamaños `sm` y `md`; loading. |
| `IconButton` | Botón icon-only con label, tooltip y tone. |
| `Dialog` | Modal con focus trap, scroll interno y footer. |
| `Input` | Campo de texto estándar. |
| `Select` | Selector estándar. |
| `Textarea` | Campo multilínea. |
| `FieldLabel` | Label visible y asociado. |
| `FieldError` | Error inline con `role="alert"`. |
| `SearchInput` | Búsqueda consistente. |
| `TemporalField` | Fecha, hora y rango de fechas. |
| `PageHeader` | Título, descripción y acción principal. |
| `Badge` | Estado compacto con tono semántico. |
| `EmptyState` | Sin datos o sin resultados. |
| `ErrorState` | Error recuperable. |
| `Skeleton` | Loading estructural. |
| `BrandLogo` | Logo y wordmark monocromáticos. |
| `ThemeProvider` | Estado global de tema. |
| `ThemeToggle` | Cambio de tema. |
| `styles.ts` | Clases canónicas de controles, campos y estados. |

## 11. Botones y acciones

| Variante | Uso |
| --- | --- |
| `primary` | Crear, guardar, login y acción principal. |
| `secondary` | Cancelar, paginación y acciones secundarias. |
| `ghost` | Acción discreta. |
| `danger` | Eliminación y operaciones destructivas. |

Tamaños:

- `sm`: `px-3 py-1.5`, uso administrativo denso.
- `md`: `px-4 py-2`, login, setup y submits destacados.

Reglas:

- Una sola acción primary dominante por contexto.
- No crear variantes nuevas por pantalla.
- Danger no se usa para llamar la atención.
- Los links que parecen botones usan apariencia secondary.
- Un submit async usa `loading`, queda disabled y comunica `loadingLabel`.
- No anunciar éxito hasta confirmar persistencia.
- Las acciones destructivas requieren confirmación explícita.

## 12. Formularios

- Label visible para cada control.
- Placeholder nunca sustituye al label.
- Una columna en móvil, dos desde `md`, hasta tres desde `xl` cuando el ancho
  lo permite.
- Base normal: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`.
- Campos largos o dependientes pueden ocupar todo el ancho.
- Separación estándar: `space-y-4`.
- Focus: `border-accent` y `ring-accent/25`.
- Error inmediatamente debajo del campo.
- Requisitos comunicados por label o helper, no solo por rojo o asterisco.
- Disabled: fondo muted, texto muted y `cursor-not-allowed`.
- Errores del servidor se transforman en mensajes comprensibles.
- Nunca se muestran mensajes internos, stack traces o secretos.

Estados obligatorios: idle, pending, success y failure. Pending preserva los
valores y bloquea la acción. Success refresca datos y muestra feedback breve.
Failure conserva el draft y asocia el error al campo cuando corresponde.

## 13. Dialogs y overlays

`Dialog` es el único modal del sistema.

- Wrapper fijo con `z-40`.
- Backdrop `absolute inset-0 bg-overlay` detrás del panel.
- Panel `relative z-10` sobre el backdrop.
- Tamaños: `sm max-w-md`, `md max-w-lg`, `lg max-w-2xl`.
- Centrado en desktop.
- Alto máximo: `max-h-[calc(100dvh-2rem)]`.
- Header y footer fijos; solo el contenido hace scroll.
- Body scroll bloqueado mientras está abierto.
- Cierre por Escape, click en backdrop y botón X visible.
- Focus inicial en el objetivo indicado o en cerrar.
- Tab atrapado en el panel y focus devuelto al trigger al cerrar.
- `role="dialog"`, `aria-modal="true"` y label basado en el título.
- Footer con cancelar secondary y confirmar primary.
- En móvil ocupa el ancho disponible y respeta el viewport.

Un dialog destructivo muestra el nombre del objeto, la consecuencia y acciones
explícitas. No se apilan dialogs. La reautenticación conserva el draft de la
acción sensible.

## 14. Shell del panel

- Sidebar compacta en desktop.
- Drawer de navegación en móvil.
- Header con usuario, tema y reloj regional.
- Área principal flexible con `p-4 sm:p-6`.
- Navegación activa con indicador de 2 px y fondo `accent-muted`.
- Toolbars como bandas tonales compactas.
- Tablas con header tonal sutil.
- Acciones de fila compactas.
- Cambio a lista móvil cuando una tabla pierde legibilidad.

El header regional muestra fecha y hora con precisión de minuto. En móvil
muestra solo la hora. No muestra segundos, ciudad, abreviatura de zona ni
controles de agenda.

## 15. Tablas, filtros y listados

- Header de tabla con `surface-subtle`.
- Texto de tabla `text-sm`.
- Celdas y headers `px-4 py-2.5`.
- Filas separadas por `border-border`.
- SKU, slug, IDs y valores alineables pueden usar Geist Mono.
- Valores monetarios usan `tabular-nums`.
- Toolbar compacta con búsqueda, filtros y acciones.
- Paginación con acciones secondary.
- Estado de filtro, orden y página siempre visible.
- `EmptyState` cuando no hay resultados.
- `ErrorState` para errores recuperables.
- `Skeleton` conserva la estructura durante loading.
- Lista responsive cuando las columnas no caben con legibilidad.

## 16. Estados de contenido

Cada pantalla de datos debe diseñar explícitamente loading, empty, success,
error recuperable, unauthorized, disabled, pending mutation y destructive
confirmation.

Las notificaciones breves son complementarias. Un error importante también
debe aparecer junto al contenido afectado. Nunca comunicar un estado solo con
color.

## 17. Responsive y breakpoints

- Mobile first.
- En móvil se priorizan contenido, acción principal y navegación mediante
  drawer.
- En `sm` se amplía el padding y se permite más aire horizontal.
- En `md` se habilitan grupos de formulario de dos columnas.
- En `lg` se utiliza la composición completa de sidebar, header y contenido.
- En `xl` los formularios pueden usar tres columnas y las tablas más datos.
- Los dialogs siempre deben caber en el viewport.
- Ninguna acción crítica puede depender exclusivamente de hover.

## 18. Fechas, horas y contexto regional

Los campos de fecha y hora son controles nativos accesibles con label, valor
controlado, disabled, required y error asociado.

- Los rangos limitan cada extremo mediante `min` y `max`.
- La validación de dominio ocurre antes de enviar.
- Las fechas locales se convierten mediante un helper explícito.
- Solo se envían resultados válidos.
- Los instantes persistidos se convierten al contexto local para editarse.
- El render usa locale y zona horaria efectiva.
- Gaps y overlaps de DST se muestran como errores de validación.
- No se confía en la zona implícita del navegador.

## 19. Accesibilidad

- Todo control tiene nombre accesible.
- Todo input tiene label asociado.
- Focus visible con contraste suficiente.
- Errores inline con asociación semántica y `role="alert"` cuando corresponde.
- Dialogs implementan Escape, focus trap y retorno de focus.
- Acciones async anuncian `aria-busy` o un status.
- El significado no depende solo del color.
- SVG redundantes usan `aria-hidden="true"`.
- La UI funciona con teclado y viewport reducido.
- La UI respeta movimiento reducido.

## 20. Motion

La interfaz es predominantemente estática. Solo se permiten transiciones
funcionales de 100 a 150 ms para hover, focus, cambio de estado, dialog,
drawer, tooltip, toast y loading.

No usar fade-ins de página, count-ups, parallax, elementos flotantes,
animaciones de tarjetas ni gradientes animados. `prefers-reduced-motion`
reduce las transiciones y animaciones a un mínimo y nunca debe sobrescribirse.

## 21. Pantallas y patrones

### Login y setup

- Fondo `bg-background` a toda altura.
- Contenido centrado.
- Wordmark sobre tarjeta.
- Tarjeta `max-w-sm`, `bg-surface` y sombra de panel.
- `ThemeToggle` discreto.
- Inputs con labels visibles.
- Submit primary, tamaño `md`, full width y loading.

### Productos y categorías

- Page header con acción principal.
- Toolbar con búsqueda y filtros.
- Tabla responsive.
- Ordenamiento y paginación visibles.
- Dialogs para crear, editar y eliminar.
- Badges para estados.
- Skeleton, empty y error states.

### Usuarios

- Búsqueda y filtro de estado.
- Tabla o lista responsive.
- Badges success y danger con texto.
- Dialog de crear y editar.
- Roles mediante checkboxes etiquetados.
- Acciones visibles solo cuando el usuario puede realizarlas.

### Auditoría

- Filtros compactos.
- Lista densa de eventos.
- Outcome visible mediante texto y tono semántico.
- Timestamps formateados con contexto regional.

### Perfil, preferencias, seguridad y compañía

- Secciones compactas con títulos claros.
- Formularios con errores inline.
- Confirmaciones para cambios sensibles.
- Contexto regional efectivo visible cuando sea relevante.

## 22. Datos y persistencia de UI

El frontend utiliza un cliente REST tipado para usuario autenticado, sesiones,
compañía, categorías, productos, paginación, estadísticas, roles, usuarios,
auditoría, permisos y contexto regional.

La UI no es fuente de verdad para negocio, permisos, autenticación o
persistencia. Solo puede persistir localmente preferencias de presentación:

- tema;
- accent;
- preferencias visuales equivalentes.

Nunca guardar en localStorage credenciales, tokens, permisos, datos de negocio
ni una sesión alternativa. La autenticación usa cookies HttpOnly y sesión del
servidor.

## 23. Reglas de implementación

- TypeScript estricto.
- No usar `any`.
- Usar primitives existentes antes de crear una nueva.
- Usar tokens semánticos, nunca hex o paletas raw en JSX o CSS de componentes.
- Mantener el código vertical, legible y consistente.
- Los textos deben ser claros, neutrales y precisos.
- No crear un patrón visual de uso único si existe uno reutilizable.
- No introducir otra fuente, familia de iconos o sistema de radius.
- No almacenar datos funcionales como una preferencia local.
- No anunciar persistencia antes de una confirmación real.

## 24. Checklist de una nueva pantalla

- [ ] Usa shell, tokens y primitives del sistema.
- [ ] Tiene jerarquía clara de título, sección y contenido.
- [ ] Tiene una acción principal evidente.
- [ ] Funciona en Light, Dark y System.
- [ ] Usa Source Sans 3 y mono solo para datos técnicos.
- [ ] Usa el grid de 4 px y la escala de spacing existente.
- [ ] Usa únicamente radius y sombras permitidos.
- [ ] Tiene loading, empty, error, success y disabled.
- [ ] Tiene labels visibles y errores inline.
- [ ] Tiene focus visible y navegación por teclado.
- [ ] Los icon-only buttons tienen `aria-label`.
- [ ] Los dialogs gestionan focus, Escape y scroll.
- [ ] Las tablas tienen una solución responsive.
- [ ] Los estados semánticos no dependen solo del color.
- [ ] Respeta `prefers-reduced-motion`.
- [ ] No agrega dependencias sin justificación.
