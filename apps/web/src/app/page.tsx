'use client';

import { useQuery } from '@tanstack/react-query';
import type { AuthSession, SetupStatus } from '@geedyx/contracts';
import { LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BrandLogo } from '../components/brand/brand-logo';
import { ThemeToggle } from '../components/theme/theme-toggle';
import { ApiClientError, getCurrentSession, getSetupStatus } from '../lib/api-client';
import { cn } from '../lib/cn';

const setupQueryKey = ['setup', 'status'];
const sessionQueryKey = ['auth', 'session'];

function EntryShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main
      className={cn([
        'min-h-dvh bg-background text-foreground',
        'px-4 py-6',
        'sm:px-6',
      ])}
    >
      <div
        className={cn([
          'mx-auto flex max-w-md flex-col justify-center',
          'min-h-[calc(100dvh-3rem)]',
        ])}
      >
        <div className={cn(['mb-6 flex items-center justify-between gap-4'])}>
          <BrandLogo />
          <ThemeToggle />
        </div>
        {children}
      </div>
    </main>
  );
}

function EntryMessage({
  action,
  children,
}: Readonly<{
  action?: React.ReactNode;
  children: React.ReactNode;
}>) {
  return (
    <section
      className={cn([
        'rounded-xl border border-border bg-surface',
        'p-5 shadow-sm sm:p-6',
      ])}
    >
      <p className={cn(['text-lg font-medium tracking-tight'])}>{children}</p>
      {action ? <div className={cn(['mt-6'])}>{action}</div> : null}
    </section>
  );
}

export default function HomePage() {
  const router = useRouter();
  const setupQuery = useQuery<SetupStatus, ApiClientError>({
    queryFn: getSetupStatus,
    queryKey: setupQueryKey,
  });
  const sessionQuery = useQuery<AuthSession, ApiClientError>({
    enabled: setupQuery.data?.installationStatus === 'COMPLETED',
    queryFn: getCurrentSession,
    queryKey: sessionQueryKey,
  });

  useEffect(() => {
    if (setupQuery.data?.installationStatus === 'PENDING') {
      router.replace('/setup');
      return;
    }

    if (sessionQuery.data) {
      router.replace('/app');
      return;
    }

    if (sessionQuery.error?.status === 401) {
      router.replace('/login');
    }
  }, [router, sessionQuery.data, sessionQuery.error, setupQuery.data]);

  const checkingSession =
    setupQuery.data?.installationStatus === 'COMPLETED' && sessionQuery.isPending;
  const redirecting =
    setupQuery.data?.installationStatus === 'PENDING' ||
    sessionQuery.error?.status === 401 ||
    Boolean(sessionQuery.data);

  if (setupQuery.isPending || checkingSession || redirecting) {
    return (
      <EntryShell>
        <EntryMessage>
          <span className={cn(['flex items-center gap-3'])}>
            <LoaderCircle aria-hidden="true" className={cn(['h-5 w-5 animate-spin'])} />
            Preparando Geedyx…
          </span>
        </EntryMessage>
      </EntryShell>
    );
  }

  const retry =
    setupQuery.data?.installationStatus === 'COMPLETED'
      ? sessionQuery.refetch
      : setupQuery.refetch;

  return (
    <EntryShell>
      <EntryMessage
        action={
          <button
            className={cn([
              'inline-flex items-center justify-center rounded-full',
              'border border-border-strong px-3 py-1.5',
              'text-sm font-medium',
              'transition hover:bg-surface-subtle',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
            ])}
            onClick={() => retry()}
            type="button"
          >
            Intentar de nuevo
          </button>
        }
      >
        No pudimos abrir Geedyx. Inténtalo de nuevo cuando la aplicación esté
        disponible.
      </EntryMessage>
    </EntryShell>
  );
}
