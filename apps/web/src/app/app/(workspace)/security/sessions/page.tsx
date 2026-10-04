'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MonitorSmartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ActiveSession, AuthSession } from '@geedyx/contracts';
import {
  ConfirmDialog,
  FeedbackAlert,
  useToast,
} from '../../../../../components/feedback/feedback';
import { PageHeader } from '../../../../../components/layout/page-header';
import {
  ApiClientError,
  getCurrentSession,
  getOwnSessions,
  revokeOwnSession,
} from '../../../../../lib/api-client';
import { cn } from '../../../../../lib/cn';

const sessionQueryKey = ['auth', 'session'];
const sessionsQueryKey = ['auth', 'sessions'];

function sessionName(session: ActiveSession): string {
  if (session.userAgent?.includes('Chrome')) return 'Chrome';
  if (session.userAgent?.includes('Firefox')) return 'Firefox';
  if (session.userAgent?.includes('Safari')) return 'Safari';
  return 'Navegador o dispositivo';
}

export default function SessionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);
  const sessionQuery = useQuery<AuthSession, ApiClientError>({
    queryFn: getCurrentSession,
    queryKey: sessionQueryKey,
  });
  const sessionsQuery = useQuery<{ sessions: ActiveSession[] }, ApiClientError>({
    enabled: Boolean(sessionQuery.data),
    queryFn: getOwnSessions,
    queryKey: sessionsQueryKey,
  });
  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => revokeOwnSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
      notify({
        message: 'La sesión fue revocada.',
        title: 'Sesión cerrada',
        tone: 'success',
      });
      setSessionToRevoke(null);
    },
  });

  useEffect(() => {
    if (sessionQuery.error?.status === 401) router.replace('/login');
  }, [router, sessionQuery.error]);

  if (sessionQuery.isPending || sessionsQuery.isPending) {
    return <p className={cn(['text-sm text-secondary'])}>Cargando sesiones…</p>;
  }
  if (!sessionQuery.data) {
    return <FeedbackAlert tone="error">La sesión ya no está disponible.</FeedbackAlert>;
  }
  if (sessionsQuery.isError) {
    return (
      <FeedbackAlert tone="error">
        No pudimos cargar tus sesiones activas.
      </FeedbackAlert>
    );
  }

  return (
    <div className={cn(['space-y-6'])}>
      <PageHeader
        description="Revisa dónde está abierta tu cuenta y cierra accesos que ya no reconozcas."
        eyebrow="Seguridad"
        title="Sesiones activas"
      />
      {sessionsQuery.data.sessions.length === 0 ? (
        <FeedbackAlert>No hay sesiones activas para mostrar.</FeedbackAlert>
      ) : (
        <section
          className={cn([
            'space-y-3 rounded-xl border border-border bg-surface p-5 shadow-sm',
          ])}
        >
          {sessionsQuery.data.sessions.map((session) => (
            <article
              className={cn([
                'flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface-subtle p-4',
              ])}
              key={session.id}
            >
              <div className={cn(['flex items-start gap-3'])}>
                <span
                  className={cn([
                    'grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-muted text-accent',
                  ])}
                >
                  <MonitorSmartphone aria-hidden="true" className={cn(['h-5 w-5'])} />
                </span>
                <div>
                  <h2 className={cn(['font-medium'])}>{sessionName(session)}</h2>
                  <p className={cn(['mt-1 text-sm text-secondary'])}>
                    {session.ipAddress ?? 'Origen no disponible'}
                  </p>
                  <p className={cn(['mt-1 text-xs text-muted'])}>
                    Actividad{' '}
                    {format(new Date(session.lastActivityAt), 'dd/MM/yyyy HH:mm', {
                      locale: es,
                    })}
                  </p>
                </div>
              </div>
              <button
                className={cn([
                  'inline-flex items-center gap-2 rounded-full border border-border-strong px-3 py-2',
                  'text-sm font-medium transition hover:bg-surface',
                ])}
                onClick={() => setSessionToRevoke(session.id)}
                type="button"
              >
                Cerrar sesión
              </button>
            </article>
          ))}
        </section>
      )}
      <ConfirmDialog
        confirmLabel="Cerrar sesión"
        description="El dispositivo tendrá que iniciar sesión nuevamente para acceder a Geedyx."
        onCancel={() => setSessionToRevoke(null)}
        onConfirm={() => {
          if (sessionToRevoke) revokeMutation.mutate(sessionToRevoke);
        }}
        open={Boolean(sessionToRevoke)}
        pending={revokeMutation.isPending}
        title="¿Cerrar esta sesión?"
      />
    </div>
  );
}
