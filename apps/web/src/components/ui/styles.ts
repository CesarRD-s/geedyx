/*
 * Class builders for the GEEDYX design system (see docs/UI.md).
 *
 * Everything here derives from the semantic tokens declared in
 * globals.css; components compose these strings instead of repeating
 * hard-coded palette utilities.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const BUTTON_BASE =
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60";

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 gap-1.5",
  md: "px-4 py-2 gap-2",
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent-active focus-visible:ring-accent/40",
  secondary:
    "border border-border-strong bg-surface text-foreground hover:bg-surface-subtle focus-visible:ring-accent/40",
  ghost:
    "text-muted hover:bg-surface-subtle hover:text-foreground focus-visible:ring-accent/40",
  danger:
    "border border-border-strong bg-surface text-danger-strong hover:bg-danger/10 focus-visible:ring-danger/30",
};

export function buttonClassName(
  variant: ButtonVariant,
  size: ButtonSize = "sm",
  extra = "",
): string {
  return `${BUTTON_BASE} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${extra}`.trim();
}

/* Icon-only buttons: always rendered with aria-label + title by consumers. */
export const iconButtonClass =
  "inline-flex items-center justify-center rounded-full p-2 text-muted transition-colors hover:bg-surface-subtle hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-60";

/* Form controls */
export const formInputClass =
  "w-full rounded-md border border-border-strong bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-muted";

/* Field label + inline validation error */
export const fieldLabelClass = "mb-1 block text-sm font-medium text-foreground";
export const fieldErrorClass = "mt-1 text-sm text-danger-strong";

/* Helper / secondary text */
export const helperTextClass = "text-sm text-muted";
export const helperTextXsClass = "text-xs text-muted";

/* Dense admin tables.
 * The header band (bg-surface-subtle) gives tables a clear reading anchor
 * without extra borders - documented in docs/UI.md §12. */
export const tableWrapClass =
  "overflow-x-auto rounded-md border border-border bg-surface";
export const theadRowClass =
  "border-b border-border bg-surface-subtle text-left text-xs uppercase tracking-wide text-muted";
export const thClass = "px-4 py-2.5 font-medium";
export const tbodyRowClass = "divide-y divide-border";
export const rowHoverClass = "transition-colors hover:bg-surface-subtle";
export const tdClass = "px-4 py-2.5";

/* Mobile stacked list equivalent of a table row */
export const mobileListClass =
  "divide-y divide-border rounded-md border border-border bg-surface sm:hidden";

/* Status banners */
export const successBannerClass =
  "px-3 py-2 text-sm text-success-strong";
export const errorBannerClass =
  "px-3 py-2 text-sm text-danger-strong";

/* Navigation link (admin sidebar).
 * Active = subtle accent-muted fill, accent text and a 2px accent indicator
 * bar on the left - documented in docs/UI.md §14. */
export function navLinkClass(active: boolean): string {
  return `relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
    active
      ? "bg-accent-muted text-accent"
      : "text-muted hover:bg-surface-subtle hover:text-foreground"
  }`;
}
