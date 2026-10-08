'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@geedyx/contracts';
import { cn } from '../../lib/cn';

type PaginationControlsProps = {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function PaginationControls({
  onPageChange,
  onPageSizeChange,
  pagination,
}: PaginationControlsProps) {
  const rangeStart =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const rangeEnd = Math.min(pagination.page * pagination.pageSize, pagination.total);
  const buttonStyles = cn([
    'inline-flex items-center gap-1 rounded-full border border-border-strong px-2 py-1.5',
    'text-xs font-medium transition hover:bg-surface-subtle',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ]);

  return (
    <div
      className={cn([
        'flex flex-col items-start gap-3 border-t border-border pt-4',
        'sm:flex-row sm:items-center sm:justify-between',
      ])}
    >
      <p className={cn(['text-xs text-muted'])}>
        {rangeStart}–{rangeEnd} de {pagination.total}
      </p>
      <div
        className={cn([
          'flex w-full flex-wrap items-center gap-2',
          'sm:w-auto sm:flex-nowrap',
        ])}
      >
        <label className={cn(['flex items-center gap-2 text-xs text-secondary'])}>
          Por página
          <select
            aria-label="Elementos por página"
            className={cn([
              'rounded-full border border-input-border bg-input px-2.5 py-1.5 text-xs',
              'text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
            ])}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            value={pagination.pageSize}
          >
            {[10, 25, 50, 100].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </label>
        <div className={cn(['ml-auto flex shrink-0 items-center gap-2'])}>
          <button
            aria-label="Página anterior"
            className={buttonStyles}
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className={cn(['h-3.5 w-3.5'])} />
            Anterior
          </button>
          <span
            className={cn(['whitespace-nowrap text-xs font-medium text-secondary'])}
          >
            {pagination.page} / {pagination.pageCount}
          </span>
          <button
            aria-label="Página siguiente"
            className={buttonStyles}
            disabled={pagination.page >= pagination.pageCount}
            onClick={() => onPageChange(pagination.page + 1)}
            type="button"
          >
            Siguiente
            <ChevronRight aria-hidden="true" className={cn(['h-3.5 w-3.5'])} />
          </button>
        </div>
      </div>
    </div>
  );
}
