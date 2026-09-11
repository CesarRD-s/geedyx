import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./icon-button";

type DialogSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<DialogSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface DialogProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  size?: DialogSize;
}

/**
 * Modal dialog (cp12). Solves the previous overlay bug (the backdrop used to
 * paint above the panel and swallow every event over the form):
 *
 * - the panel is `relative` + `z-10` inside the `z-40` fixed wrapper, so it
 *   always paints above the `bg-overlay` backdrop;
 * - the body scroll is locked while open and restored on close;
 * - the panel never grows taller than the viewport: the header and footer
 *   stay fixed while only the content scrolls;
 * - focus moves to the initial focus target (or the close button), Tab is
 *   trapped inside the panel, Escape closes, and focus returns to the element
 *   that opened the dialog.
 */
export function Dialog({
  title,
  description,
  onClose,
  children,
  footer,
  initialFocusRef,
  size = "sm",
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const initialTarget = initialFocusRef?.current ?? closeButtonRef.current;
    initialTarget?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [initialFocusRef]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    const panel = panelRef.current;
    if (!panel) {
      return;
    }
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ) as { focus(): void }[];
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto" onKeyDown={handleKeyDown}>
      <div
        className="absolute inset-0 bg-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`relative z-10 flex w-full max-h-[calc(100dvh-2rem)] flex-col rounded-lg border border-border bg-surface shadow-panel ${SIZE_CLASSES[size]}`}
        >
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-3">
            <div className="min-w-0">
              <h3 className="text-base font-medium text-foreground">{title}</h3>
              {description ? (
                <p className="mt-0.5 text-sm text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <IconButton
              ref={closeButtonRef}
              label="Cerrar"
              tooltip="Cerrar (Esc)"
              onClick={onClose}
              className="-mr-1"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </IconButton>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>
          {footer ? (
            <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-5 py-3">
              {footer}
            </footer>
          ) : null}
        </div>
      </div>
    </div>
  );
}