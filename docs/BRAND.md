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
- The official horizontal Light/Dark PNG assets are used in the expanded
  sidebar, mobile drawer, login and initial setup. `BrandLogo` selects the
  correct monochrome variant through the active theme.
- Do not recreate the wordmark with UI text when the official asset fits.

## Icon mark

- The official Light/Dark icon PNG assets are used by the contracted sidebar.
- The matching favicon is installed at `apps/web/src/app/favicon.ico`.
- All variants remain monochrome, legible at compact sizes and independent of
  the configurable accent.

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
