# GEEDYX — Brand

The identity rules for the GEEDYX administration console.

## Personality

GEEDYX is a serious, professional administration tool. The interface language
is **neutral, precise and calm**:

- clear information hierarchy and functional density
- compact navigation, useful tables, filters, search
- restrained surfaces and decisive, restrained accent use
- visual weight comes from structure and typography, not decoration

GEEDYX **never** looks like a generic AI-generated SaaS dashboard.

## Non-negotiables

- The **logo and wordmark are monochrome** and live on `foreground` only.
  They never use the accent, and the accent never recolors the logo.
- The accent is a configurable **product tool** for action/selection/links —
  it is completely decoupled from the brand (see
  [DESIGN-TOKENS.md](./DESIGN-TOKENS.md)).
- **No gradients, glassmorphism, or emoji** in identity or UI.
- The identity works in **Light** and **Dark** (same monochrome mark).

## Wordmark

- Written as **GEEDYX** (all caps, always).
- Sits in the sidebar top and the login card, using the `foreground` text
  token — the UI `font-sans` stack. It is a mark, not a logo lockup with
  decoration.

## Icon mark

- The favicon (`apps/web/src/app/favicon.ico`) is the current mark. A proper
  icon mark may be added in a later checkpoint; until then the wordmark at
  `font-semibold lg:font-bold tracking-tight` is the primary identity.
- Future icon mark requirements: monochrome, minimum 16×16 legible, works on
  both `background` and `surface`, zero accent dependency.

## What not to do

- Colored or gradient versions of the logo/wordmark.
- Accent-colored sidebar/header treatments around the identity.
- The wordmark in lowercase, spaced out with `tracking-widest`, or with an
  added tagline.
- Reusing generic "gear/monitor/chart" clipart as an identity mark.

## Related

- [DESIGN-TOKENS.md](./DESIGN-TOKENS.md) — token/color system
- [UI.md](./UI.md) — interface contract
- [DECISIONS.md](./DECISIONS.md) — ADR-029 (Design System v1.0)