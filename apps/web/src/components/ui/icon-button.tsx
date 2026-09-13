import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { iconButtonClass } from "./styles";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: accessible name for screen readers. */
  label: string;
  /** Optional native tooltip; falls back to `label`. */
  tooltip?: string;
  tone?: "default" | "danger";
  children: ReactNode;
}

/**
 * Icon-only button. Always receives `label` (aria-label) and - when the
 * meaning is not obvious - a `tooltip`. Never render an icon-only button
 * without an accessible name.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, tooltip, tone = "default", className = "", children, ...props },
    ref,
  ) {
    const classes =
      tone === "danger"
        ? `${iconButtonClass} text-danger-strong hover:bg-danger/10 hover:text-danger-strong`
        : `${iconButtonClass} ${className}`;
    return (
      <button
        ref={ref}
        type={props.type ?? "button"}
        {...props}
        aria-label={label}
        title={tooltip ?? label}
        className={classes}
      >
        {children}
      </button>
    );
  },
);