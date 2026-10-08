import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export const dataTableHeaderTextClassName = cn([
  'text-xs uppercase tracking-wide text-muted',
]);

export const dataTableHeaderRowClassName = cn([
  'bg-surface-subtle',
  dataTableHeaderTextClassName,
]);

export const dataTableHeaderCellClassName = cn(['px-5 py-3 font-medium']);

type DataTableFrameProps = {
  ariaLabel: string;
  children: ReactNode;
  footer?: ReactNode;
  tableClassName?: string;
};

export function DataTableFrame({
  ariaLabel,
  children,
  footer,
  tableClassName,
}: DataTableFrameProps) {
  return (
    <section
      className={cn([
        'overflow-hidden rounded-xl border border-border bg-surface shadow-sm',
      ])}
    >
      <div
        aria-label={`Tabla desplazable: ${ariaLabel}`}
        className={cn(['overflow-x-auto'])}
        role="region"
        tabIndex={0}
      >
        <table
          aria-label={ariaLabel}
          className={cn([
            'w-full border-collapse text-left text-sm',
            tableClassName ?? '',
          ])}
        >
          {children}
        </table>
      </div>
      {footer ? <div className={cn(['px-5 pb-5'])}>{footer}</div> : null}
    </section>
  );
}
