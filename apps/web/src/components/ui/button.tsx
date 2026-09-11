import type { ButtonHTMLAttributes, ReactNode } from "react";
import { buttonClassName, type ButtonSize, type ButtonVariant } from "./styles";

type ButtonVariantProp = ButtonVariant;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariantProp;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}

/**
 * GEEDYX button. Variants: primary, secondary, ghost, danger.
 * When `loading` is set the button is disabled and shows `loadingLabel`
 * (used for form submits and pending mutations).
 */
export function Button({
  variant = "primary",
  size = "sm",
  loading = false,
  loadingLabel = "Guardando…",
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const content = loading ? loadingLabel : children;
  return (
    <button
      type={props.type ?? "button"}
      {...props}
      disabled={isDisabled}
      aria-busy={loading}
      className={buttonClassName(variant, size, className)}
    >
      <span className="truncate">{content}</span>
    </button>
  );
}