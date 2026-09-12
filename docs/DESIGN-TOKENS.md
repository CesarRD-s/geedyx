# GEEDYX — Design Tokens v1.0

Living reference for the semantic design tokens implemented in
`apps/web/src/app/globals.css`. This is the **source of truth** for token names
and values; `docs/UI.md` is the contract that explains *how* to use them.

> Consume **semantic** tokens only. Never hard-code raw palette values
> (slate/blue/white/hex) inside components. If a value must change, change the
> token in `globals.css`, never a component class.

Tokens are CSS custom properties declared for light (`:root`) and dark
(`.dark`) and mapped into Tailwind utilities through `@theme inline`, so a token
like `--text-muted` becomes the utility `text-muted`.

## Canonical names vs. CP12 aliases

The CP12 names were compatibility aliases during the CP12.5 → CP12.6 transition
and have been **removed** with the CP12.6 migration. The aliases no longer exist
in `globals.css`; do not reintroduce them:

- `--foreground` → use `--text`
- `--muted-foreground` → use `--text-muted`
- `--surface-muted` → use `--surface-subtle`
- `--surface-elevated` → use `--surface-raised`
- `--primary` / `--primary-hover` / `--primary-active` /
  `--primary-foreground` / `--primary-muted` → use the `--accent` family

All UI uses the canonical names below.

---

## Colors

### Neutral (surfaces)

Neutral surfaces make up most of the interface. Light and Dark must feel like
two themes of the same product; the sidebar, header and content belong to the
same tonal family.

| Token | Utility | Light | Dark | Intent |
| --- | --- | --- | --- | --- |
| `--background` | `bg-background` | `#fafafa` | `#101114` | Page background |
| `--surface` | `bg-surface` | `#ffffff` | `#18191c` | Primary surfaces (cards, tables, dialogs, header, sidebar) |
| `--surface-subtle` | `bg-surface-subtle` | `#f4f4f5` | `#202226` | Hover fills, muted fills, skeletons |
| `--surface-raised` | `bg-surface-raised` | `#ffffff` | `#282a2f` | Elevated surfaces above `surface` |

### Text

Text hierarchy is built primarily by **size, weight, contrast, spacing and
position** — not by arbitrary colors.

| Token | Utility | Light | Dark | Intent |
| --- | --- | --- | --- | --- |
| `--text` | `text-foreground` | `#18181b` | `#f4f4f5` | Primary text / titles |
| `--text-secondary` | `text-secondary` | `#52525b` | `#d4d4d8` | Secondary body text |
| `--text-muted` | `text-muted` | `#71717a` | `#a1a1aa` | Labels, captions, meta, placeholders |

> The primary text keeps the utility name `text-foreground` (the name
> `text-text` is ambiguous); its backing token is `--text`.

### Borders

Borders are not mandatory everywhere — use them to separate surfaces, delimit
structures, define controls, communicate states.

| Token | Utility | Light | Dark | Intent |
| --- | --- | --- | --- | --- |
| `--border` | `border-border` | `#e4e4e7` | `#2b2d32` | Table rows, dividers, container edges |
| `--border-strong` | `border-border-strong` | `#d4d4d8` | `#454850` | Inputs, button outlines, dashed frames, focus-worthy edges |

### Accent

The accent drives **action, selection, links, focus and interactive meaning** —
not the brand. The logo/wordmark is **monochrome** and never uses the accent
(see `docs/BRAND.md`).

The accent is **configurable**: supported picker values are `blue` (default),
`indigo`, `emerald`, `violet` and `rose`. They swap the whole accent family
through `data-accent="..."` on `<html>`. The accent is reserved for actions,
selection, links, focus and indicators; it is never a general page or panel
background. The brand stays monochrome.

| Token | Utility | Light | Dark | Intent |
| --- | --- | --- | --- | --- |
| `--accent` | `bg-accent` / `text-accent` | `#2563eb` | `#3b82f6` | Primary action fill, selected nav, links, focus |
| `--accent-hover` | `hover:bg-accent-hover` | `#1d4ed8` | `#2563eb` | Primary hover |
| `--accent-active` | `active:bg-accent-active` | `#1e40af` | `#1d4ed8` | Primary pressed |
| `--accent-foreground` | `text-accent-foreground` | `#ffffff` | `#ffffff` | Text/icon on accent fills |
| `--accent-muted` | `bg-accent-muted` | `#eff6ff` | `rgb(59 130 246 / .14)` | Selected/active navigation background (small surfaces only) |

Rules:

- Use accent on: primary actions, selected navigation, links, focus rings,
  selection, indicators, charts, progress, important interactive elements.
- **Never** use accent as a general background for the sidebar, header, whole
  sections, large cards, or decorative fills.

### Semantic status

Semantic colors communicate meaning only — never decoration.

| Token | Utility | Light | Dark | Intent |
| --- | --- | --- | --- | --- |
| `--success` / `--success-strong` | `bg-success` / `text-success-strong` | `#16a34a` / `#15803d` | `#22c55e` / `#4ade80` | Operation succeeded, available, active, saved |
| `--warning` / `--warning-strong` | `bg-warning` / `text-warning-strong` | `#f59e0b` / `#b45309` | `#f59e0b` / `#fbbf24` | Attention, low stock, caution |
| `--danger` / `--danger-strong` | `bg-danger` / `text-danger-strong` | `#dc2626` / `#b91c1c` | `#ef4444` / `#f87171` | Error, destruction, out of stock |
| `--info` / `--info-strong` | `bg-info` / `text-info-strong` | `#2563eb` / `#1d4ed8` | `#60a5fa` / `#93c5fd` | Informational states |

`info` is an independent token (defaults to the same blue family as the accent)
so it can diverge from the accent later.

### Misc

| Token | Utility | Light | Dark | Intent |
| --- | --- | --- | --- | --- |
| `--overlay` | `bg-overlay` | `rgba(15,23,42,.5)` | `rgb(2 6 23 / .6)` | Dialog/drawer backdrops |
| `--input` | `bg-input` | `#ffffff` | `#141d2e` | Input/select/textarea background |
| `--selection` | (native) | `#dbeafe` | `rgb(59 130 246 / .35)` | Text selection highlight |

---

## Typography

- UI family: **Source Sans 3** (variable, loaded via `next/font/google` in
  `apps/web/src/app/layout.tsx`, exposed as `--font-source`). It provides an
  open source, enterprise-oriented alternative with a similar clarity to Dell's
  restrained web typography without using Dell proprietary fonts.
- Used weights: **300 Light, 400 Regular, 500 Medium, 600 Semibold, 700 Bold**.
- The wordmark is **independent** of the UI typography (see `docs/BRAND.md`).
- Mono (`Geist Mono`, `--font-mono`) is kept only for **data identifiers**
  (SKU, slug, IDs, price alignment) — it is not an interface family.
- Do not introduce a second UI family without an explicit, documented reason.
- Hierarchy is built with size + weight + contrast + spacing + position; do not
  use weights arbitrarily.
- Monetary values always use `tabular-nums`.

## Spacing

- System based on a **4px** grid: 4 · 8 · 12 · 16 · 24 · 32 · 48.
- Tailwind's default scale is the 4px base (`--spacing: 0.25rem`); utilities
  like `p-4` (16px), `gap-3` (12px), `space-y-6` (24px) are the vocabulary.
- Avoid arbitrary `p-[13px]` / `gap-[7px]` values when a token fits.
- Density is valued for a business tool, without sacrificing legibility.

## Radius

GEEDYX uses a compact rounded scale inspired by current productivity software.
`rounded-none` and `rounded-sm` are intentionally excluded from product UI.

| Token | Value | Use |
| --- | --- | --- |
| `--radius-md` | `4px` | Inputs, tables, selects, controls and navigation |
| `--radius-lg` | `8px` | Larger grouped surfaces |
| `--radius-full` | `9999px` | Only when circular/pill shape has meaning (dots, avatars) |

Do not apply `rounded` automatically to everything. Never arbitrary values like
`rounded-[20px]`.

## Shadows

Shadows are **discrete and functional**, reserved for elements that overlap
other content:

- modal, dropdown, popover, drawer, floating menu, the login card.

Normal surfaces separate through surface + border + spacing — **not** shadows.
Cards and tables use the `shadow-panel` token only when they float.

## Motion

GEEDYX is **predominantly static**. Only functional, brief transitions are
allowed, 100–150ms, when they add value:

- hover, focus, state changes, dropdown, modal, drawer, tooltip, toast.

Tokens: `--duration-fast` (100ms) / `--duration-normal` (150ms).

Avoid: page fade-ins, count-ups, floating elements, parallax, card animations,
animated gradients, decorative movement.

**Always** respect `prefers-reduced-motion` (a global rule already in
`globals.css` collapses transitions and animations for users who request it).

---

## Related

- [UI.md](./UI.md) — visual contract (how tokens are used)
- [BRAND.md](./BRAND.md) — brand personality and monochrome identity rules
- [DECISIONS.md](./DECISIONS.md) — ADR-029 (Design System v1.0)
- [AGENTS.md](../AGENTS.md) — mandatory consultation before UI work
