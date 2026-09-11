import type { ReactNode } from "react";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE_CLASSES: Record<BadgeTone, { text: string; dot: string }> = {
  neutral: { text: "text-muted", dot: "bg-muted" },
  success: { text: "text-success-strong", dot: "bg-success" },
  warning: { text: "text-warning-strong", dot: "bg-warning" },
  danger: { text: "text-danger-strong", dot: "bg-danger" },
  info: { text: "text-info-strong", dot: "bg-info" },
};

/**
 * Compact status indicator: a small dot + label. These are status badges, not
 * decorative pills — use them consistently for active/inactive, stock and
 * availability states.
 */
export function Badge({
  tone = "neutral",
  dot = true,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
}) {
  const { text, dot: dotClass } = TONE_CLASSES[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${text}`}>
      {dot ? (
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      ) : null}
      {children}
    </span>
  );
}