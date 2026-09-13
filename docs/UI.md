# GEEDYX - UI / Design System

This document is the **official Design System contract for GEEDYX**. It defines
the visual language, the semantic tokens, the shared components, and the rules
that every screen must follow.

A new GEEDYX screen must answer the question

> "¿Cómo debe verse una nueva página de GEEDYX?"

by reusing the tokens, components, patterns, hierarchies, states and
interaction rules described here - **not** by inventing a new style.

> Rule: all new UI must use the Design System defined in this document. Do not
> introduce new visual patterns when an existing pattern is sufficient.

Token values and the full token reference live in
[`docs/DESIGN-TOKENS.md`](./DESIGN-TOKENS.md); identity rules live in
[`docs/BRAND.md`](./BRAND.md). This document is the how-to-use contract.

## Status

- **CP7** - first administration experience: `/login` and the protected admin
  shell.
- **CP8** - categories CRUD, now served at `/app/categories`.
- **CP9** - products CRUD, now served at `/app/products` (list, filters, sorting,
  pagination, dialogs, images, stock).
- **CP10** - public catalog: `/` landing and `/products/[slug]`.
- **CP12** - **Design System established**: semantic tokens + Light/Dark/System
  themes, shared UI component set, dialog/overlay fixes, hard-coded palette
  colors removed, and this document converted into the official contract.
- **CP12.1** - **initial installation**: `/setup` completes the first-run
  experience (create the company and primary administrator via
  `POST /api/v1/auth/setup`), reusing the `/login` layout pattern.
- **CP12.2** - public catalog removed (`/` is now a session redirect to
  `/app` or `/login`); `/login` no longer exposes the `/setup` entry point.
- **CP12.5** - **Design System v1.0**: canonical token nomenclature
  (neutral/text/border/accent/semantic), configurable accent decoupled from the
  brand, Source Sans 3 UI typography, compact radius scale, and motion/borders
  rules formalized. Token source of truth moved to `docs/DESIGN-TOKENS.md`;
  identity rules live in `docs/BRAND.md`. CP12 names became deprecated
  compatibility aliases.
- **CP12.6** - **GEEDYX Design System applied to the existing UI**: every screen
  (`/setup`, `/login`, `/app*`) and shared component migrated to canonical
  tokens; CP12 aliases (`primary*`, `surface-muted`, `surface-elevated`,
  `muted-foreground`, `foreground`) **removed** from `globals.css`. Tables gain a
  subtle header band (§12), the nav active state adds a 2px accent indicator
  (§14), and list toolbars become tonal bands without container borders (§16).

Two distinct experiences share one visual system:

- **Internal workspace** (`/setup`, `/login`, `/app*`) - density-first,
  batched workflows, tables, filters, fast actions (AWS Console inspiration).
- **Public catalog** (`/`, `/products/[slug]`) - product presentation and
  readability (Dell product-site inspiration).

They differ in composition and density, never in tokens or components.

## Design principles

GEEDYX does **not** use generic AI-generated dashboard aesthetics. It looks and
feels like a real administrative/product application.

Prioritize:

- clear information hierarchy
- functional density
- compact navigation
- useful tables
- filters and search
- clear actions
- restrained cards
- consistent spacing
- responsive layouts
- legible contrast in both themes

Avoid:

- excessive rounded cards (`rounded-3xl`, `rounded-[20px]`)
- decorative gradients and glassmorphism
- excessive shadows
- decorative UI without purpose
- oversized dashboard metric cards
- generic AI SaaS layouts
- repeating a card when a simple section is enough
- icon-heavy decoration (each icon must add information)
- random single-use colors (`bg-blue-600`/`text-gray-500`/`border-gray-200`)

Inspiration is conceptual only - AWS Console (information density, table-first
administration), Dell (product presentation, content hierarchy), modern SaaS
(consistency, feedback, accessibility). Proprietary interfaces are never copied.

---

## 1. Design tokens

The single source of truth for colors lives in `apps/web/src/app/globals.css`.
Values are CSS custom properties declared for light (`:root`) and dark (`.dark`)
and mapped into Tailwind utilities through `@theme inline`, so components use
**semantic** utilities - never raw palette colors.

**Never scatter raw hex/slate/blue/white values across components.** Add or
change a token in `globals.css` instead. Any new token must be mapped in
`@theme inline` so it becomes a Tailwind utility.

**Canonical names.** The CP12 names (`primary*`, `surface-muted`,
`surface-elevated`, `muted-foreground`, `foreground`) were deprecated
compatibility aliases and have been **removed in CP12.6** - only the canonical
names below exist. Never reintroduce them.

### Surfaces

| Token | Utility | Light | Dark | Usage |
| --- | --- | --- | --- | --- |
| `background` | `bg-background` | `#f8fafc` | `#0b1220` | page background |
| `surface` | `bg-surface` | `#ffffff` | `#141d2e` | cards, tables, dialogs, header |
| `surface-subtle` | `bg-surface-subtle` | `#f1f5f9` | `#1a2437` | hover, muted fills, skeletons |
| `surface-raised` | `bg-surface-raised` | `#ffffff` | `#1f2b42` | elevated elements |

### Text

| Token | Utility | Light | Dark | Usage |
| --- | --- | --- | --- | --- |
| `text` | `text-foreground` | `#0f172a` | `#e6edf6` | primary text/titles |
| `text-secondary` | `text-secondary` | `#475569` | `#cbd5e1` | secondary body text |
| `text-muted` | `text-muted` | `#64748b` | `#94a3b8` | labels, meta, placeholders |

> The primary text keeps the utility `text-foreground`; its backing token is
> `text`.

### Borders

| Token | Utility | Light | Dark | Usage |
| --- | --- | --- | --- | --- |
| `border` | `border-border` | `#e2e8f0` | `#223049` | table rows, dividers, container edges |
| `border-strong` | `border-border-strong` | `#cbd5e1` | `#3b4a63` | inputs, button outlines, dashed frames |

### Accent (configurable - action, selection, links)

| Token | Utility | Light | Dark | Usage |
| --- | --- | --- | --- | --- |
| `accent` | `bg-accent` / `text-accent` | `#2563eb` | `#3b82f6` | primary actions, focused nav, links, focus |
| `accent-hover` | `hover:bg-accent-hover` | `#1d4ed8` | `#2563eb` | primary button hover |
| `accent-active` | `active:bg-accent-active` | `#1e40af` | `#1d4ed8` | primary button active/press |
| `accent-foreground` | `text-accent-foreground` | `#ffffff` | `#ffffff` | text on accent fills |
| `accent-muted` | `bg-accent-muted` | `#eff6ff` | `rgb(59 130 246 / 0.14)` | selected/active nav background |

### Status accents

| Token | Utility | Light | Dark | Usage |
| --- | --- | --- | --- | --- |
| `success` / `success-strong` | `bg-success` / `text-success-strong` | `#16a34a` / `#15803d` | `#22c55e` / `#4ade80` | available, active, saved |
| `warning` / `warning-strong` | `bg-warning` / `text-warning-strong` | `#f59e0b` / `#b45309` | `#f59e0b` / `#fbbf24` | low stock, caution |
| `danger` / `danger-strong` | `bg-danger` / `text-danger-strong` | `#dc2626` / `#b91c1c` | `#ef4444` / `#f87171` | delete, errors, out of stock |
| `info` / `info-strong` | `bg-info` / `text-info-strong` | `#2563eb` / `#1d4ed8` | `#60a5fa` / `#93c5fd` | informational states |

The accent is **decoupled from the brand**: the GEEDYX identity stays
monochrome (`docs/BRAND.md`), while the accent drives interaction only. It is
configurable - set `data-accent="indigo"` on `<html>` to switch the whole
accent family (alternate palettes live in `globals.css`); a picker UI can drive
that attribute in a later checkpoint. `info` is an **independent** token so it
can diverge from the accent later.

### Misc

| Token | Utility | Light | Dark | Usage |
| --- | --- | --- | --- | --- |
| `overlay` | `bg-overlay` | `rgba(15,23,42,.5)` | `rgb(2 6 23 / .6)` | dialog/drawer backdrops |
| `input` | `bg-input` | `#ffffff` | `#141d2e` | input/select/textarea background |
| `selection` | (native) | `#dbeafe` | `rgb(59 130 246 / .35)` | text selection highlight |
| `shadow-panel` | `shadow-panel` | soft dark | deeper dark | floating elements only |

Contrast is verified per pair (surface on background, text on surface, status
text on surface); the dark theme is a full surface hierarchy, not "black
background + white text".

---

## 2. Theme

GEEDYX supports **Light**, **Dark** and **System** themes.

- Implemented with `next-themes` (`attribute="class"`, `defaultTheme="system"`,
  `enableSystem`). Global provider lives in
  `src/components/ui/theme-provider.tsx`, mounted in `src/app/layout.tsx`.
- The `.dark` class is applied to `<html>` by the provider; `globals.css`
  declares `color-scheme` for `light`/`dark` so native controls match.
- The `ThemeToggle` (`src/components/ui/theme-toggle.tsx`) is a discreet
  icon-only button - never a protagonist. It uses a mounted guard
  (`useSyncExternalStore`) to avoid hydration mismatch and shows the action
  that would run on click.
- `suppressHydrationWarning` is set on `<html>`; no other the-theme-specific
  hacks are allowed.

A component must never reach for `dark:` exceptions - theming is handled by the
tokens. If a color needs a dark variant, change the token in `globals.css`.

---

## 3. Typography

Fonts: **Source Sans 3** (UI family, variable font, weights 300–700) + **Geist Mono**
(data identifiers only), loaded via `next/font/google` in the root layout as
`--font-source` (mapped to `--font-sans`) / `--font-geist-mono` (mapped to
`--font-mono`).

Recommended scale (administrative, density-first - titles are not huge):

| Role | Classes |
| --- | --- |
| Page title (public) | `text-2xl font-semibold text-foreground` |
| Page/section title (admin) | `text-xl font-semibold text-foreground` |
| Section heading | `text-sm font-medium text-foreground` |
| Body | `text-sm text-foreground` |
| Secondary text | `text-sm text-secondary` |
| Label / helper | `text-sm` / `text-xs text-muted` |
| Caption / table header | `text-xs uppercase tracking-wide text-muted` |
| Table text | `text-sm` |
| Monetary value (tabular) | `text-… tabular-nums` |

The public catalog may use a wider, more commercial hierarchy (larger prices,
`text-lg` product names) while keeping the same font family and token colors.

Mono (`--font-mono`) is reserved for data identifiers (SKU, slug, IDs, price
alignment) - it is not an interface family. Monetary values always use
`tabular-nums`.

---

## 4. Spacing

Use the built-in Tailwind scale. Repetitive patterns must be consistent:

- **Page padding (public)**: `px-4 py-6 sm:px-6` inside `max-w-6xl mx-auto`.
- **Page padding (admin)**: `<main className="flex-1 p-4 sm:p-6">` in the shell.
- **Section spacing**: `space-y-4` between a section's blocks, `space-y-6`
  between major page blocks.
- **Form spacing**: `space-y-4` between fields/groups, `mt-6` after the intro.
- **Table cells**: `px-4 py-2.5` cells, `px-4 py-2.5` headers.
- **Dialog**: `px-5 py-3` header/footer, `px-5 py-4` content.
- **Card**: `p-4`; product cards `p-4` content.
- **Navigation**: `px-3 py-2` links, `space-y-1` list, `py-4` nav padding.

Don't invent `p-3`/`p-7`/`gap-7` variations without a reason.

---

## 5. Border radius

GEEDYX uses three intentional shapes. `rounded-none` and `rounded-sm` are not
part of the product vocabulary.

- `rounded-md`: inputs, selects, tables, navigation and grouped controls.
- `rounded-lg`: dialogs and larger elevated panels.
- `rounded-full`: buttons, icon buttons, badges, status dots and avatars.
- Never use arbitrary `rounded-[20px]`, `rounded-3xl`, or `rounded-[…]`.

---

## 6. Shadows

Shadows are for floating elements only and come from the `shadow-panel` token:

- dialogs, mobile drawer, dropdowns/popovers, the login card.

Cards and tables separate visually with surface + border, not shadows.

---

## 7. Icons

Icons come exclusively from **`lucide-react`** (pinned dependency). Usage
rules:

Use icons for: navigation, search, filters, the mobile menu, closing dialogs,
edit/delete row actions, sorting indicators, availability status when useful,
theme toggle, and recognizable compact actions.

Do **not** use icons to: decorate every section, accompany every label, fill
empty space, make buttons look "modern", or repeat an action whose label
already communicates it.

Examples:

```
[ Editar ]   [🗑]               (table row: text button + icon-only delete)
buscar term…  [Search]          (search field)
```

Icons render with `className="h-4 w-4"` and `aria-hidden="true"` on the `<svg>`.

---

## 8. Icon-only buttons

`IconButton` (`src/components/ui/icon-button.tsx`) is the only way to render
an icon-only button. Requirements:

- `label` prop (rendered as `aria-label`) is **mandatory**.
- `tooltip` (native `title`) is added when the meaning is not obvious from
  context.
- hover, `focus-visible` ring, and disabled states come from
  `iconButtonClass` in `styles.ts`.
- Danger-tone icon buttons use `tone="danger"`.

Never render an unlabeled icon-only button.

---

## 9. Buttons

Variants live in `src/components/ui/styles.ts` (`buttonClassName`) and render
through `Button` (`src/components/ui/button.tsx`):

| Variant | Title | When |
| --- | --- | --- |
| `primary` | `bg-accent` | one main action per screen (create, save, login) |
| `secondary` | bordered surface | secondary actions, cancel, pagination links |
| `ghost` | muted text | discreet actions |
| `danger` | danger outline/text | destructive actions only |

Variant names (`primary`/`secondary`/… ) are the **component API**; their fill
colors resolve through the accent tokens, so the "primary" variant re-themes
automatically when the accent changes.

Sizes: `sm` (`px-3 py-1.5`) default for dense admin use; `md` (`px-4 py-2`) for
large/primary surfaces (login, full-width submits).

Rules:

- Do not create a new variant per screen.
- Danger is for destructive actions, not for drawing attention.
- Buttons that are links use `secondaryButtonClass` (exported from
  `styles.ts`) so links match the secondary button exactly.
- `Button` supports `loading` + `loadingLabel`: it disables and announces
  `aria-busy`, used for every async submit/mutation. Normal children render
  directly inside the flex container so icon + text combinations remain
  horizontally aligned and can be reused consistently.

---

## 10. Forms / Inputs

Shared primitives in `src/components/ui/field.tsx`: `Input`, `Select`,
`Textarea`, `FieldLabel`, `FieldError`. Form class strings (`formInputClass`,
`fieldLabelClass`, `fieldErrorClass`, `helperTextClass`) live in `styles.ts`.

Rules:

- **Labels are always visible**; never rely on placeholders alone.
- One control per row/column with `space-y-4`; grouped fieldsets use a small
  section heading and consistent spacing.
- **Desktop uses the available width**: a related field group starts as one
  column on narrow screens, becomes two columns when its container can keep
  controls legible, and may use three columns on wide page forms. Use
  `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` as the normal page-form
  starting point; choose a later breakpoint for constrained dialogs. Long or
  dependent fields may span the group width. Do not stack an entire desktop
  form vertically when horizontal space is available.
- Inline validation errors appear directly under the field (`FieldError`,
  `role="alert"`).
- Required/constraints are communicated by the label/help text, not by red or
  asterisks alone.
- `disabled` state: muted background + muted text + `cursor-not-allowed`.
- Focus: `border-accent` + `ring-accent/25` (see `formInputClass`).
- Submit disable + `loadingLabel` on the primary button prevents double
  submission.
- Errors are user-facing Spanish, mapped from API status
  (`lib/api/http.ts`); raw/internal messages are never shown.
- User-facing text, documentation and code comments use commas, colons or a
  simple hyphen where punctuation is needed. Do not use the em dash character.

---

## 11. Dialogs / modals

`Dialog` (`src/components/ui/dialog.tsx`) is the **only** dialog primitive.
All form dialogs and delete confirmations use it.

Structure and behavior (CP12 - critical requirement, previously broken):

- **Layering**: fixed wrapper `z-40`; the backdrop is an `absolute inset-0
  bg-overlay` layer *below* the panel; the panel is `relative z-10`, so it
  always paints above the backdrop and never swallows form events.
- **Sizes**: `sm` `max-w-md`, `md` `max-w-lg`, `lg` `max-w-2xl`.
- **Positioning**: centered on desktop (`flex min-h-full items-center
  justify-center`).
- **Height/scroll**: the panel caps at `max-h-[calc(100dvh-2rem)]`; header and
  footer stay fixed while only the content area scrolls (`overflow-y-auto`).
  Footer actions remain reachable even when content grows.
- **Body scroll**: locked (`overflow:hidden`) while open, restored on close.
- **Close**: Escape, clicking the backdrop, and the always-visible ✕ button
  (`IconButton` with `aria-label="Cerrar"`).
- **Focus (accessibility)**: focus moves to `initialFocusRef` (or the close
  button) on open, Tab is trapped inside the panel, focus returns to the
  triggering element on close, `role="dialog"` + `aria-modal="true"` +
  `aria-label={title}`.
- **Structure**: header (title, optional description, close button) / scrollable
  content / footer (secondary action + primary action, right-aligned).

Mobile: the dialog fills the width (`w-full`, `p-4`) and stays within the
viewport; it is not a scaled-down desktop modal. Scrolling inside works.

Never hand-roll a new modal; extend `Dialog` when a need is real.

---

## 12. Tables

Tables are the primary admin data view. Class string tokens live in `styles.ts`
(`tableWrapClass`, `theadRowClass`, `thClass`, `tbodyRowClass`, `rowHoverClass`,
`tdClass`, `mobileListClass`).

Pattern (desktop):

```
Header | Data | Data | Status | Actions
```

- Wrap: `rounded-md border border-border bg-surface`.
- Header row: `theadRowClass` - `bg-surface-subtle` header band (subtle tonal
  anchor, no extra borders), uppercase `text-xs`, muted.
- Rows: divide-y, `hover:bg-surface-subtle`.
- Cells: `px-4 py-2.5`; numeric columns right-aligned, `tabular-nums`.
- Actions are grouped on the right, compact; correct example:
  `[ Editar ] [🗑]` - text button + icon-only delete with `aria-label`/tooltip.
- **Never** wrap every row in a rounded card.
- Mobile: the same data renders as stacked rows (`mobileListClass`) prioritizing
  image, name, price, stock, status and actions - no horizontal scroll as a
  default.

Loading rows use the `Skeleton` pattern; empty tables use `EmptyState`.
Pagination: page number × size selects + Anterior/Siguiente, `disabledPaginationClass`
for the disabled faux-buttons.

---

## 13. Status / badges

`Badge` (`src/components/ui/badge.tsx`): compact dot + label (not a pill).
Tones: `neutral`, `success`, `warning`, `danger`, `info`.

Canonical mappings:

| State | Tone |
| --- | --- |
| Activo / Disponible / saved | `success` |
| Inactivo / neutral metadata | `neutral` |
| Stock bajo ("Stock limitado") | `warning` |
| Agotado / deleted / error | `danger` |
| Informational | `info` |

`Availability` (`src/components/catalog/availability.tsx`) centralizes the
public availability wording ("Disponible", "Stock limitado - quedan N",
"Agotado"). The admin `StatusCell`/`StockCell` in `products-view.tsx` follow the
same tones.

**Persistent states are shown as icon + text (dot + label), never as buttons or
text-turned-into-actions** - a state is information, not an interaction. Do not
invent a new color per page; reuse the tones above.

---

## 14. Navigation / Admin shell

`WorkspaceShell` (`src/components/workspace-shell.tsx`) provides the internal
workspace identity and compact operational density.

- **Desktop**: fixed sidebar expanded at `w-60` with the GEEDYX brand and an
  icon + label navigation list (Panel / Productos / Categorías). A labeled
  icon button contracts it to `w-16`; the compact header becomes a single
  clickable GEEDYX icon that expands the menu, while navigation keeps icons,
  accessible names and native tooltips. The preference persists locally as
  presentation state. Active item =
  `bg-accent-muted` + `text-accent` plus a **2px accent indicator bar**
  (`w-0.5 h-4 rounded-full bg-accent`) absolute on the link's left edge
  (`navLinkClass`); hover = `surface-subtle`.
- The content offset follows the selected width (`md:pl-60` expanded,
  `md:pl-16` contracted). Width changes do not use animation.
- **Header** (h-14, sticky): mobile menu button, current section title, signed-in
  user (initial avatar + username + muted email), `ThemeToggle`, and a **ghost
  icon + text** logout button (`LogOut` icon) - the last item before logout stays
  visually quiet.
- **Mobile**: hamburger opens a left drawer (`z-30`) with overlay, Escape and
  overlay-click to close, focusable content, `role="dialog"`.
- **Z-index order**: sidebar `z-20` < mobile drawer `z-30` < dialog `z-40`.
- Navigation icons are allowed (recognition); decorative icons are not.
- New sections in V1/V2 must follow the same `NAV_ITEMS` shape (href, label,
  icon).

Public header (`catalog-header.tsx`): compact - wordmark, "Catálogo" active
nav, `ThemeToggle`, discreet "Administración" link. No sidebar, no login wall.

---

## 15. Page headers

`PageHeader` (`src/components/ui/page-header.tsx`): title + one-line
description + optional right-aligned primary action. Used across admin screens
(Products, Categories, Dashboard) so hierarchy is consistent.

Public pages use headings directly (larger title, richer spacing) but the same
token colors.

---

## 16. Filter toolbars

List pages keep a consistent toolbar pattern:

- the toolbar container is a **tonal band**: `rounded-md bg-surface-subtle`
  with `p-3`, no container border - a subtle fill, not another box
- labeled `SearchInput` (always visible label)
- grouped `Select` filters (category, status, sort field)
- sort direction toggle
- "Limpiar filtros" action when any filter is active
- meta line: total, "Página X de Y", page-size select, Anterior/Siguiente -
  divided from the filters above by a hairline `border-t border-border/60`

The toolbar wraps naturally on mobile; controls are grouped, never a chaotic
row of buttons. Implementation: `products-view.tsx` (the public catalog filters
shared this pattern; the catalog was removed in CP12.2).

---

## 17. Loading

Patterns:

- **Route loading**: `loading.tsx` renders token-colored skeletons
  (`bg-surface-subtle`), not raw `slate-*`. The `Skeleton` component
  (`src/components/ui/skeleton.tsx`) exists for block placeholders; filling
  containers use `animate-pulse rounded-md border border-border bg-surface`.
- **Table loading**: header/toolbar/table skeleton that mirrors the real layout.
- **Submit/button loading**: `Button` `loading` prop (disabled + label swap).
- **Image loading**: `product-image-field.tsx` renders a dashed
  `bg-surface-subtle` placeholder while no image is set.

Loading must communicate *what* is happening; decorative oversized loaders are
avoided.

---

## 18. Empty states

`EmptyState` (`src/components/ui/empty-state.tsx`): dashed `border-strong` panel
with optional icon, title, description, and one action.

Honest copy patterns:

- "No hay productos disponibles" / "No hay productos todavía"
- "Aún no hay categorías"
- "Sin resultados" + "No encontramos … que coincidan con tu búsqueda." + action
  ("Limpiar filtros" / "Nueva categoría" / "Nuevo producto")

No giant decorative illustrations; one small icon is allowed when it helps.

---

## 19. Error states

- **Route error boundaries** (`error.tsx`): share `ErrorState`
  (`src/components/ui/error-state.tsx`) with a friendly title, description and
  a "Reintentar" button. Page shells wrap it in their own layout (admin shell /
  catalog header) so the error stays on-brand.
- **Form/API errors**: inline `FieldError` near the field; banner-level API
  errors use `successBannerClass` / `errorBannerClass` with icon + text and no
  decorative border or fill. Transient notices auto-dismiss only when the
  context remains recoverable.
- Errors are clear Spanish messages mapped by status; never raw stacks, Prisma
  codes or internals.
- Failure after a successful save degrades to a banner and never breaks the
  product (e.g. image upload).

---

## 20. Cards

Cards are used when they group related information - not as the default
container for everything.

- `SummaryCard`: restrained stat block (label, `tabular-nums` value, optional
  detail) - no giant metric cards.
- `ProductCard` (public): image 4:3, category, name, price, availability,
  "Ver detalle". That is the one legitimate repeating-card surface (catalog
  grid).
- Avoid card-inside-card; a bordered `section` or plain divider is enough for
  most grouping.

---

## 21. Responsive

Responsive is not "make it `flex-col`". It is reviewed per surface:

- **Navigation**: sidebar hidden on mobile → drawer; header stays compact.
- **Tables**: stacked rows on `< sm`, dense table on `sm+`.
- **Dialogs**: full-width within the viewport on mobile, centered on desktop;
  internal scroll.
- **Forms/filters**: wrap; controls are grouped; labels stay visible.
- **Catalog grid**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- **Buttons**: never overflow a row; text buttons keep their labels.
- **Spacing/typography**: `px-4` on mobile, `sm:px-6` on desktop.

The admin is primarily a desktop experience; the public catalog must feel
right on phones and tablets.

---

## 22. Accessibility

Accessibility is a release requirement for every screen and flow, including
authentication and security settings. The target is WCAG 2.2 AA for the
application interface.

Minimum bar:

- visible `focus-visible` ring on every interactive element
  (`focus-visible:ring-2 focus-visible:ring-accent/40`)
- a visible-on-focus skip link leads to the main content of the workspace
- full keyboard navigation: dialogs and drawers trap focus, support Escape and
  restore focus to their trigger; pagination, filters and actions use native
  controls
- labels on all fields; `aria-label` on all icon-only buttons
- contrast meeting WCAG AA in both themes (token pairs)
- clear disabled states
- errors associated with their fields (`FieldError`, `role="alert"`)
- dialogs: `role="dialog"`, `aria-modal`, `aria-label`, trapped focus
- no information conveyed by color alone (dot + text on badges, icon + label
  on actions)

Keyboard shortcuts are optional enhancements, never the sole way to complete
an action. Do not use `accesskey`, override browser or assistive-technology
shortcuts, or bind global keys without a documented, discoverable purpose. A
shortcut must work only when it does not intercept typing in a field, and must
be disabled while a dialog or drawer owns focus.

---

## 23. Component inventory

Shared primitives in `src/components/ui/` (single source of truth):

| Component | File | Notes |
| --- | --- | --- |
| `Button` | `button.tsx` | primary/secondary/ghost/danger, sm/md, loading |
| `IconButton` | `icon-button.tsx` | icon-only, mandatory `label` |
| `Input`/`Select`/`Textarea`/`FieldLabel`/`FieldError` | `field.tsx` | forms |
| `Dialog` | `dialog.tsx` | accessible modal, sizes sm/md/lg |
| `Badge` | `badge.tsx` | compact status indicator |
| `EmptyState` | `empty-state.tsx` | dashed panel + action |
| `ErrorState` | `error-state.tsx` | route error boundaries |
| `PageHeader` | `page-header.tsx` | admin section header |
| `SearchInput` | `search-input.tsx` | labeled search field |
| `Skeleton` | `skeleton.tsx` | block placeholder |
| `ThemeProvider` | `theme-provider.tsx` | next-themes wrapper |
| `ThemeToggle` | `theme-toggle.tsx` | discreet light/dark/system toggle |
| `styles.ts` | class-string tokens | CSS-class builders for the above |

Feature components compose these primitives under `components/products/` and
`components/categories/`.

**Instructions for new screens**: before writing markup, check `styles.ts`,
`components/ui/*` and an existing screen that already implements the pattern.
Reuse first; extend the system only when a real, repeated need exists. Do not
build an internal framework; add a component when it stops duplication.

---

## 24. Interaction, persistence and feedback

Every interactive control follows the same lifecycle:

1. **Idle**: action is available and its label explains the result.
2. **Pending**: disable the triggering action, preserve the entered values and
   announce progress with `aria-busy` or a status message.
3. **Success**: keep the user in context, refresh the affected query and show a
   brief icon + text notification.
4. **Failure**: keep recoverable input, associate validation with its field and
   show a concise Spanish explanation with a retry action when appropriate.

Mutations must be idempotent from the UI perspective: prevent double submits,
invalidate stale server data after success and never pretend persistence
completed before the API confirms it. Destructive actions require a Dialog with
the object name, consequence and explicit confirm/cancel actions. Closing a
dialog without saving discards only local draft state.

Preferences such as theme and accent may persist in local storage because they
are presentation-only. Business data, authentication, permissions and drafts
must persist through the API and database; never use local storage as a source
of truth for them. Toasts are short-lived and supplementary: important errors
remain next to the affected content and are never communicated by color alone.

Events must have one visible outcome. Use `onChange` for local field state,
`onBlur` for lightweight validation, `onSubmit` for mutations and explicit
`onConfirm` callbacks for destructive operations. Avoid global event listeners
unless the shared primitive owns cleanup (Escape, focus trap, scroll lock).

## 25. Accent and semantic color contract

The configurable accent is reserved for actions, links, focus, selection and
progress. Success, warning, danger and info always use their independent
semantic tokens, so changing `data-accent` cannot recolor an error into a
success or reduce status contrast. New accent palettes must provide light and
dark values for the complete accent family and pass WCAG AA against the target
surface before they are added to the picker.

Do not compose status colors with accent opacity, gradients or decorative fills.
Use the semantic icon plus a text label; status meaning must survive grayscale,
color-vision differences and theme changes.

## 26. Library policy

- Icons: `lucide-react` (added in CP12 as part of the Design System).
- Themes: `next-themes` (added in CP12; Light/Dark/System).
- No generic UI kits or animation libraries. Tailwind + React + Next.js handle
  layout and effects while the shared primitives keep the GEEDYX identity.
- **React Hook Form + Zod** are the preferred form and schema pair when forms
  become multi-step or need server-error mapping; use the existing primitives
  as their rendered controls.
- **TanStack Query** is the preferred REST cache/invalidation layer once the
  screens need optimistic updates or coordinated refetching.
- **next-themes** remains the theme persistence layer; presentation preferences
  may use a small typed storage adapter rather than ad-hoc calls.
- **Prisma** remains the persistence boundary in NestJS. File uploads should
  use provider-neutral presigned uploads before choosing S3, Supabase or
  Cloudinary.

New dependencies require justification per AGENTS.md.

## 25. Initial setup (`/setup`)

`/setup` is the first-visit onboarding experience of a GEEDYX installation and
must feel like part of the same product as `/login`:

- **Layout**: mirror `/login` exactly - centered `max-w-sm` surface card,
  wordmark above, `ThemeToggle` top-right, `bg-background` full-height main.
  Do not invent a different onboarding aesthetic.
- **Behavior**: the Server Component calls `getSession()`; with an active
  session it `redirect("/app")` (an authenticated user never sees the
  form). Without one it renders the `SetupForm`.
- **Form**: `SetupForm` reuses `Input`/`FieldLabel`/`FieldError`/`Button`
  (primary, `md`, full-width, `loading`/`loadingLabel`). Fields are company
  name, username, email, password and installation secret with visible labels;
  client validation is minimal (required, password ≥ 8 and secret ≥ 32), while
  the backend remains the authority. On success the component navigates to
  `/app` after the API sets the HttpOnly cookie.
- **Already configured**: the page first reads `GET /api/v1/auth/installation`
  and redirects to `/login` when installation is complete. A concurrent `403`
  from `POST /api/v1/auth/setup` is handled as the same state. Network/`400`
  failures use the standard error-mapping rules (§ 19) and keep the form
  retryable.
- `/setup` is not linked from `/login` (as of CP12.2); it is reached by
  direct navigation only. The page exists at a known, stable path.
- No password hashing, localStorage tokens or new auth state on this screen;
  it only ships credentials to the existing API contract.

## 26. User management (`/app/users`)

The internal users module follows the standard dense administration pattern:

- `PageHeader` exposes “Nuevo usuario” only to users with `users.manage`.
- Search and status filters remain in the compact toolbar; results use the
  existing responsive table/mobile-list pattern.
- Active and suspended accounts use `Badge` with semantic success and danger
  tones. The status always has a visible text label.
- Create and edit use the existing `Dialog`, `Input`, `Select`, visible labels
  and field-level errors. Role assignment uses labeled checkboxes rather than
  decorative pills.
- Navigation and mutating controls are hidden when permissions are absent, but
  NestJS remains the authorization authority. The owner is shown as immutable
  for role/state changes.

## 27. Motion

GEEDYX is **predominantly static** - information density over show. Only
functional, brief transitions are allowed (100–150ms) when they genuinely help:
hover/focus states, dropdown/dialog/drawer to/from, tooltips, toasts, loading
feedback.

- Use `--duration-fast` (100ms) / `--duration-normal` (150ms) for transitions.
- Avoid decorative motion: page fade-ins, count-ups, floating elements,
  parallax, card-entry animations, animated gradients.
- **Respect `prefers-reduced-motion`**: a global rule in `globals.css`
  collapses transitions and animations for users who request it. Never disable
  or override that rule.

## 28. Borders

Borders are a primary structuring tool in a dense admin UI - used to separate
surfaces, delimit structures, define controls and communicate states.

- `border-border` (subtle) for table rows, dividers and container edges.
- `border-border-strong` (strong) for inputs, button outlines, dashed drop
  zones and edges that must stand out.
- Do not border everything; separate with `surface` differences and spacing
  first (headers, cards, sections).
- Filling containers on the loading pattern use `border-border`.

## Related

- [PRODUCT.md](./PRODUCT.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [BRAND.md](./BRAND.md)
- [DESIGN-TOKENS.md](./DESIGN-TOKENS.md)
- [DECISIONS.md](./DECISIONS.md) (ADR-027, ADR-029)
- [AGENTS.md](../AGENTS.md)
