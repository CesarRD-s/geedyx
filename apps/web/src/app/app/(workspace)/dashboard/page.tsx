'use client';

import type { AuthSession } from '@geedyx/contracts';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '../../../../components/layout/page-header';
import { FeedbackAlert } from '../../../../components/feedback/feedback';
import {
  ApiClientError,
  getConfiguration,
  getCurrentSession,
} from '../../../../lib/api-client';
import { cn } from '../../../../lib/cn';

const sessionQueryKey = ['auth', 'session'];

export default function DashboardPage() {
  const sessionQuery = useQuery<AuthSession, ApiClientError>({
    queryFn: getCurrentSession,
    queryKey: sessionQueryKey,
  });
  const configurationQuery = useQuery({
    enabled: Boolean(
      sessionQuery.data?.user.permissions.includes('configuration.read'),
    ),
    queryFn: getConfiguration,
    queryKey: ['configuration'],
  });

  if (!sessionQuery.data) {
    return null;
  }

  const session = sessionQuery.data;

  return (
    <div className={cn(['space-y-6'])}>
      <PageHeader
        description="Resumen de la operación y accesos rápidos."
        eyebrow="Panel operativo"
        title={`Bienvenido, ${session.user.displayName}`}
      />

      {configurationQuery.data && !configurationQuery.data.isComplete ? (
        <FeedbackAlert title="Configuración pendiente" tone="warning">
          <span>
            Completa los datos de la empresa para activar los formatos globales del
            sistema.{' '}
            <Link
              className={cn(['font-medium text-accent hover:text-accent-hover'])}
              href="/app/configuration/company"
            >
              Configurar empresa
            </Link>
          </span>
        </FeedbackAlert>
      ) : null}

      <section
        className={cn([
          'rounded-lg border border-border bg-surface',
          'p-5 shadow-sm sm:p-6',
        ])}
      >
        <div className={cn(['flex items-start gap-4'])}>
          <span
            className={cn([
              'grid h-11 w-11 shrink-0 place-items-center rounded-full',
              'bg-success/10 text-success-strong',
            ])}
          >
            <ShieldCheck aria-hidden="true" className={cn(['h-5 w-5'])} />
          </span>
          <div>
            <p className={cn(['text-sm font-medium text-success-strong'])}>
              Sesión protegida
            </p>
            <p className={cn(['mt-1 text-sm text-secondary'])}>{session.user.email}</p>
          </div>
        </div>
      </section>

      <section
        aria-label="Contexto de sesión"
        className={cn(['grid gap-4', 'sm:grid-cols-3'])}
      >
        <article className={cn(['rounded-lg border border-border bg-surface', 'p-5'])}>
          <p className={cn(['text-xs font-medium uppercase tracking-wide text-muted'])}>
            Rol
          </p>
          <p className={cn(['mt-2 text-sm font-semibold'])}>
            {session.user.roles.join(', ') || 'Sin rol asignado'}
          </p>
        </article>
        <article className={cn(['rounded-lg border border-border bg-surface', 'p-5'])}>
          <p className={cn(['text-xs font-medium uppercase tracking-wide text-muted'])}>
            Permisos
          </p>
          <p className={cn(['mt-2 text-sm font-semibold'])}>
            {session.user.permissions.length}
          </p>
        </article>
        <article className={cn(['rounded-lg border border-border bg-surface', 'p-5'])}>
          <p className={cn(['text-xs font-medium uppercase tracking-wide text-muted'])}>
            Sesión válida hasta
          </p>
          <p className={cn(['mt-2 text-sm font-semibold'])}>
            {format(new Date(session.expiresAt), 'dd/MM/yyyy HH:mm', {
              locale: es,
            })}
          </p>
        </article>
      </section>

      {session.user.permissions.includes('users.read') ? (
        <section
          className={cn([
            'flex flex-wrap items-center justify-between gap-4',
            'rounded-lg border border-border bg-surface-subtle p-5',
          ])}
        >
          <div>
            <h2 className={cn(['font-semibold'])}>Administración de usuarios</h2>
            <p className={cn(['mt-1 text-sm text-secondary'])}>
              Consulta las cuentas y gestiona los primeros accesos.
            </p>
          </div>
          <Link
            className={cn([
              'rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground',
              'transition hover:bg-accent-hover',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
            ])}
            href="/app/users"
          >
            Ver usuarios
          </Link>
        </section>
      ) : null}
    </div>
  );
}
