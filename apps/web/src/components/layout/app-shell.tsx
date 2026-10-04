'use client';

import type { AuthSession } from '@geedyx/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppHeader } from './app-header';
import { AppNavigation } from '../navigation/app-navigation';
import { ApiClientError, getCurrentSession, logout } from '../../lib/api-client';
import { cn } from '../../lib/cn';

const sessionQueryKey = ['auth', 'session'];

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navigationPinned, setNavigationPinned] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeMobileNavigation = useCallback(() => {
    setMobileOpen(false);
    window.setTimeout(() => menuButtonRef.current?.focus(), 0);
  }, []);
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
      return;
    }

    if (sessionQuery.data?.user.passwordChangeRequired) {
      router.replace('/app/password');
    }
  }, [router, sessionQuery.data, sessionQuery.error]);

  if (
    sessionQuery.isPending ||
    sessionQuery.error?.status === 401 ||
    sessionQuery.data?.user.passwordChangeRequired
  ) {
    return (
      <main
        className={cn([
          'grid min-h-dvh place-items-center',
          'bg-background px-4 text-foreground',
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
          'bg-background px-4 text-foreground',
        ])}
      >
        <section
          className={cn([
            'max-w-md space-y-3 rounded-lg border border-border bg-surface',
            'p-6 text-center shadow-sm',
          ])}
        >
          <h1 className={cn(['text-lg font-semibold'])}>No pudimos cargar Geedyx</h1>
          <p className={cn(['text-sm text-secondary'])}>
            Revisa la conexión e inténtalo de nuevo.
          </p>
          <button
            className={cn([
              'rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground',
              'transition hover:bg-accent-hover',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
            ])}
            onClick={() => sessionQuery.refetch()}
            type="button"
          >
            Reintentar
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className={cn(['min-h-dvh bg-background text-foreground'])}>
      <AppNavigation
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobileNavigation}
        onPinnedChange={setNavigationPinned}
        session={sessionQuery.data}
      />
      <div
        className={cn([
          'min-h-dvh transition-[padding] duration-150 ease-out',
          navigationPinned ? 'lg:pl-64' : 'lg:pl-16',
        ])}
      >
        <AppHeader
          logoutPending={logoutMutation.isPending}
          menuButtonRef={menuButtonRef}
          onLogout={() => logoutMutation.mutate()}
          onOpenMenu={() => setMobileOpen(true)}
          session={sessionQuery.data}
        />
        <main className={cn(['p-4 sm:p-6'])}>
          <div className={cn(['mx-auto max-w-7xl'])}>{children}</div>
        </main>
      </div>
    </div>
  );
}
