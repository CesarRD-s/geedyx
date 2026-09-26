'use client';

import type { AuthSession } from '@geedyx/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BrandLogo } from '../../components/brand/brand-logo';
import { ThemeToggle } from '../../components/theme/theme-toggle';
import { ApiClientError, getCurrentSession, logout } from '../../lib/api-client';
import { cn } from '../../lib/cn';

const sessionQueryKey = ['auth', 'session'];

export default function AppPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const sessionQuery = useQuery<AuthSession, ApiClientError>({
    queryFn: getCurrentSession,
    queryKey: sessionQueryKey,
  });
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: sessionQueryKey });
      router.replace('/login');
    },
  });

  useEffect(() => {
    if (sessionQuery.error?.status === 401) {
      router.replace('/login');
    }
  }, [router, sessionQuery.error]);

  if (sessionQuery.isPending) {
    return (
      <main
        className={cn([
          'grid min-h-dvh place-items-center',
          'bg-background text-foreground',
          'px-4',
        ])}
      >
        <p className={cn(['text-sm text-secondary'])}>Cargando sesión…</p>
      </main>
    );
  }

  if (!sessionQuery.data) {
    return (
      <main
        className={cn([
          'grid min-h-dvh place-items-center',
          'bg-background text-foreground',
          'px-4',
        ])}
      >
        <p className={cn(['text-sm text-danger'])}>
          No pudimos cargar la sesión. Inténtalo de nuevo.
        </p>
      </main>
    );
  }

  const session = sessionQuery.data;

  return (
    <main
      className={cn([
        'min-h-dvh bg-background text-foreground',
        'px-4 py-6',
        'sm:px-6',
      ])}
    >
      <div className={cn(['mx-auto max-w-4xl space-y-8'])}>
        <header className={cn(['flex flex-wrap items-center justify-between gap-4'])}>
          <BrandLogo />
          <div className={cn(['flex items-center gap-2'])}>
            <ThemeToggle />
            <button
              className={cn([
                'inline-flex items-center gap-2 rounded-md',
                'border border-border-strong',
                'px-3 py-2',
                'text-sm font-medium',
                'transition hover:bg-surface-subtle',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
                'disabled:opacity-60',
              ])}
              disabled={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
              type="button"
            >
              <LogOut aria-hidden="true" className={cn(['h-4 w-4'])} />
              {logoutMutation.isPending ? 'Cerrando…' : 'Cerrar sesión'}
            </button>
          </div>
        </header>

        <section
          className={cn([
            'rounded-xl border border-border bg-surface',
            'p-6 shadow-sm',
            'sm:p-8',
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
              <h1 className={cn(['mt-1 text-2xl font-semibold tracking-tight'])}>
                Bienvenido, {session.user.displayName}
              </h1>
              <p className={cn(['mt-2 text-sm text-secondary'])}>
                {session.user.email}
              </p>
            </div>
          </div>
        </section>

        <section
          className={cn(['grid gap-4', 'sm:grid-cols-3'])}
          aria-label="Contexto de sesión"
        >
          <article
            className={cn(['rounded-lg border border-border bg-surface', 'p-5'])}
          >
            <p
              className={cn(['text-xs font-medium uppercase tracking-wide text-muted'])}
            >
              Rol
            </p>
            <p className={cn(['mt-2 text-sm font-semibold'])}>
              {session.user.roles.join(', ') || 'Sin rol asignado'}
            </p>
          </article>
          <article
            className={cn(['rounded-lg border border-border bg-surface', 'p-5'])}
          >
            <p
              className={cn(['text-xs font-medium uppercase tracking-wide text-muted'])}
            >
              Permisos
            </p>
            <p className={cn(['mt-2 text-sm font-semibold'])}>
              {session.user.permissions.length}
            </p>
          </article>
          <article
            className={cn(['rounded-lg border border-border bg-surface', 'p-5'])}
          >
            <p
              className={cn(['text-xs font-medium uppercase tracking-wide text-muted'])}
            >
              Sesión válida hasta
            </p>
            <p className={cn(['mt-2 text-sm font-semibold'])}>
              {format(new Date(session.expiresAt), 'dd/MM/yyyy HH:mm', {
                locale: es,
              })}
            </p>
          </article>
        </section>

        {logoutMutation.error ? (
          <p className={cn(['text-sm text-danger'])} role="alert">
            No pudimos cerrar la sesión. Inténtalo de nuevo.
          </p>
        ) : null}
      </div>
    </main>
  );
}
