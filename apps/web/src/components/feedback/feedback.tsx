'use client';

import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { cn } from '../../lib/cn';

export type FeedbackTone = 'success' | 'info' | 'warning' | 'error';

type FeedbackAlertProps = {
  children: React.ReactNode;
  tone?: FeedbackTone;
  title?: string;
};

type Toast = {
  id: number;
  message: string;
  title?: string;
  tone: FeedbackTone;
};

type ToastContextValue = {
  notify: (toast: Omit<Toast, 'id'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<FeedbackTone, string> = {
  error: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-info/30 bg-info/10 text-info',
  success: 'border-success/30 bg-success/10 text-success-strong',
  warning: 'border-warning/30 bg-warning/10 text-warning-strong',
};

function ToneIcon({ tone }: { tone: FeedbackTone }) {
  if (tone === 'success') return <CheckCircle2 aria-hidden="true" />;
  if (tone === 'warning') return <TriangleAlert aria-hidden="true" />;
  if (tone === 'error') return <XCircle aria-hidden="true" />;
  return <Info aria-hidden="true" />;
}

export function FeedbackAlert({ children, title, tone = 'info' }: FeedbackAlertProps) {
  return (
    <div
      className={cn([
        'flex items-start gap-3 rounded-xl border p-4 text-sm',
        toneStyles[tone],
      ])}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <ToneIcon tone={tone} />
      <div className={cn(['min-w-0 space-y-1'])}>
        {title ? <p className={cn(['font-semibold'])}>{title}</p> : null}
        <div className={cn(['text-foreground/80'])}>{children}</div>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current, { ...toast, id }].slice(-4));
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        aria-label="Notificaciones"
        className={cn([
          'pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2',
          'sm:left-auto sm:w-96',
        ])}
      >
        {toasts.map((toast) => (
          <div className={cn(['pointer-events-auto'])} key={toast.id}>
            <FeedbackAlert title={toast.title} tone={toast.tone}>
              <div className={cn(['flex items-start justify-between gap-3'])}>
                <span>{toast.message}</span>
                <button
                  aria-label="Cerrar notificación"
                  className={cn([
                    'shrink-0 rounded-full p-1 text-current/70 transition hover:bg-black/5',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
                  ])}
                  onClick={() => dismiss(toast.id)}
                  type="button"
                >
                  <X aria-hidden="true" className={cn(['h-4 w-4'])} />
                </button>
              </div>
            </FeedbackAlert>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe utilizarse dentro de ToastProvider.');
  }
  return context;
}

type ConfirmDialogProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  pending?: boolean;
  title: string;
};

type ModalProps = {
  children?: React.ReactNode;
  description?: string;
  footer?: React.ReactNode;
  onClose: () => void;
  open: boolean;
  size?: 'md' | 'lg' | 'xl';
  title: string;
};

const modalSizes: Record<NonNullable<ModalProps['size']>, string> = {
  lg: 'max-w-4xl',
  md: 'max-w-md',
  xl: 'max-w-6xl',
};

export function Modal({
  children,
  description,
  footer,
  onClose,
  open,
  size = 'lg',
  title,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    window.requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>('[data-modal-close], input, select, button')
        ?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className={cn([
        'fixed inset-0 z-50 grid place-items-center bg-overlay p-4 sm:p-6',
      ])}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <section
        aria-describedby={description ? descriptionId : undefined}
        className={cn([
          'flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-2xl',
          'border border-border bg-surface shadow-2xl sm:max-h-[calc(100dvh-3rem)]',
          modalSizes[size],
        ])}
        ref={panelRef}
      >
        <header
          className={cn([
            'flex items-start justify-between gap-4 border-b border-border px-5 py-4',
            'sm:px-6',
          ])}
        >
          <div className={cn(['min-w-0 space-y-1'])}>
            <h2 className={cn(['text-lg font-semibold'])} id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className={cn(['text-sm text-secondary'])} id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          <button
            aria-label="Cerrar ventana"
            className={cn([
              'shrink-0 rounded-full p-2 text-muted transition hover:bg-surface-subtle',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
            ])}
            data-modal-close="true"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className={cn(['h-5 w-5'])} />
          </button>
        </header>
        {children ? (
          <div className={cn(['min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6'])}>
            {children}
          </div>
        ) : null}
        {footer ? (
          <footer
            className={cn([
              'flex flex-col-reverse gap-3 border-t border-border px-5 py-4',
              'sm:flex-row sm:justify-end sm:px-6',
            ])}
          >
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}

export function ConfirmDialog({
  cancelLabel = 'Cancelar',
  confirmLabel = 'Confirmar',
  description,
  onCancel,
  onConfirm,
  open,
  pending = false,
  title,
}: ConfirmDialogProps) {
  return (
    <Modal
      description={description}
      footer={
        <>
          <button
            className={cn([
              'rounded-full border border-border-strong px-3 py-2 text-sm font-medium',
              'transition hover:bg-surface-subtle disabled:opacity-60',
            ])}
            disabled={pending}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={cn([
              'rounded-full bg-accent px-3 py-2 text-sm font-medium text-accent-foreground',
              'transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60',
            ])}
            disabled={pending}
            onClick={onConfirm}
            type="button"
          >
            {pending ? 'Procesando…' : confirmLabel}
          </button>
        </>
      }
      onClose={pending ? () => undefined : onCancel}
      open={open}
      size="md"
      title={title}
    />
  );
}
