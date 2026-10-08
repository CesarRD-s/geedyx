'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { AuditResponse, AuthSession } from '@geedyx/contracts';
import { FeedbackAlert } from '../../../../components/feedback/feedback';
import {
  DataTableFrame,
  dataTableHeaderCellClassName,
  dataTableHeaderRowClassName,
} from '../../../../components/data/data-table-frame';
import { PaginationControls } from '../../../../components/data/pagination-controls';
import { Input } from '../../../../components/forms/input';
import { PageHeader } from '../../../../components/layout/page-header';
import {
  ApiClientError,
  getAudit,
  getCurrentSession,
} from '../../../../lib/api-client';
import { cn } from '../../../../lib/cn';

const sessionQueryKey = ['auth', 'session'];

export default function AuditPage() {
  const router = useRouter();
  const [module, setModule] = useState('');
  const [outcome, setOutcome] = useState<'' | 'SUCCESS' | 'FAILURE'>('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const sessionQuery = useQuery<AuthSession, ApiClientError>({
    queryFn: getCurrentSession,
    queryKey: sessionQueryKey,
  });
  const canRead = Boolean(sessionQuery.data?.user.permissions.includes('audit.read'));
  const auditQuery = useQuery<AuditResponse, ApiClientError>({
    enabled: canRead,
    queryFn: () =>
      getAudit({
        module: module || undefined,
        outcome: outcome || undefined,
        page,
        pageSize,
        query: query || undefined,
      }),
    queryKey: ['audit', module, outcome, query, page, pageSize],
  });

  useEffect(() => {
    if (sessionQuery.error?.status === 401) router.replace('/login');
  }, [router, sessionQuery.error]);

  if (sessionQuery.isPending || auditQuery.isPending) {
    return <p className={cn(['text-sm text-secondary'])}>Cargando auditoría…</p>;
  }
  if (!sessionQuery.data || !canRead) {
    return (
      <FeedbackAlert tone="error">
        No tienes permiso para consultar la auditoría.
      </FeedbackAlert>
    );
  }
  if (auditQuery.isError) {
    return (
      <FeedbackAlert tone="error">
        No pudimos cargar el registro de auditoría.
      </FeedbackAlert>
    );
  }

  return (
    <div className={cn(['space-y-6'])}>
      <PageHeader eyebrow="Seguridad" title="Auditoría" />
      <section
        className={cn([
          'grid gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm md:grid-cols-3',
        ])}
      >
        <div>
          <label className={cn(['text-sm font-medium'])} htmlFor="audit-module">
            Módulo
          </label>
          <Input
            id="audit-module"
            onChange={(event) => {
              setPage(1);
              setModule(event.target.value);
            }}
            value={module}
          />
        </div>
        <div>
          <label className={cn(['text-sm font-medium'])} htmlFor="audit-query">
            Buscar
          </label>
          <Input
            id="audit-query"
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
            placeholder="Persona, acción o detalle"
            value={query}
          />
        </div>
        <div>
          <label className={cn(['text-sm font-medium'])} htmlFor="audit-outcome">
            Resultado
          </label>
          <select
            className={selectStyles}
            id="audit-outcome"
            onChange={(event) => {
              setPage(1);
              setOutcome(event.target.value as typeof outcome);
            }}
            value={outcome}
          >
            <option value="">Todos</option>
            <option value="SUCCESS">Exitosos</option>
            <option value="FAILURE">Fallidos</option>
          </select>
        </div>
      </section>
      {auditQuery.data.events.length === 0 ? (
        <FeedbackAlert>No hay eventos con esos filtros.</FeedbackAlert>
      ) : (
        <DataTableFrame
          ariaLabel="Registro de auditoría"
          footer={
            <PaginationControls
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPage(1);
                setPageSize(nextPageSize);
              }}
              pagination={auditQuery.data.pagination}
            />
          }
          tableClassName="min-w-[720px]"
        >
          <thead className={dataTableHeaderRowClassName}>
            <tr>
              <th className={dataTableHeaderCellClassName} scope="col">
                Fecha
              </th>
              <th className={dataTableHeaderCellClassName} scope="col">
                Módulo
              </th>
              <th className={dataTableHeaderCellClassName} scope="col">
                Acción
              </th>
              <th className={dataTableHeaderCellClassName} scope="col">
                Actor
              </th>
              <th className={dataTableHeaderCellClassName} scope="col">
                Resultado
              </th>
            </tr>
          </thead>
          <tbody>
            {auditQuery.data.events.map((event) => (
              <tr className={cn(['border-t border-border'])} key={event.id}>
                <td className={cn(['px-5 py-3 text-secondary'])}>
                  {format(new Date(event.occurredAt), 'dd/MM/yyyy HH:mm', {
                    locale: es,
                  })}
                </td>
                <td className={cn(['px-5 py-3'])}>{event.module}</td>
                <td className={cn(['px-5 py-3 font-medium'])}>{event.action}</td>
                <td className={cn(['px-5 py-3 text-secondary'])}>
                  {event.actorDisplayName ?? 'Sistema'}
                </td>
                <td className={cn(['px-5 py-3'])}>
                  <span
                    className={cn([
                      'rounded-full px-2.5 py-1 text-xs font-medium',
                      event.outcome === 'SUCCESS'
                        ? 'bg-success/10 text-success-strong'
                        : 'bg-danger/10 text-danger',
                    ])}
                  >
                    {event.outcome === 'SUCCESS' ? 'Exitoso' : 'Fallido'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTableFrame>
      )}
    </div>
  );
}

const selectStyles = cn([
  'mt-1.5 w-full rounded-xl border border-input-border bg-input px-3 py-2.5 text-sm',
  'text-foreground focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20',
]);
