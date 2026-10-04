'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import type {
  OwnerCreated,
  SessionManagementDetails,
  SetupStatus,
} from '@geedyx/contracts';
import { BrandLogo } from '../../components/brand/brand-logo';
import { Input } from '../../components/forms/input';
import { ThemeToggle } from '../../components/theme/theme-toggle';
import {
  ApiClientError,
  getSessionManagementDetails,
  getSetupStatus,
  login,
  revokeSession,
} from '../../lib/api-client';
import { cn } from '../../lib/cn';

const loginSchema = z.object({
  email: z.string().email('Escribe un correo electrónico válido.'),
  password: z.string().min(1, 'Escribe tu contraseña.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createdOwner] = useState(() =>
    queryClient.getQueryData<OwnerCreated['owner']>(['setup', 'createdOwner']),
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionManagement, setSessionManagement] =
    useState<SessionManagementDetails | null>(null);
  const revokeSessionMutation = useMutation({
    mutationFn: ({ sessionId, token }: { sessionId: string; token: string }) =>
      revokeSession(sessionId, token),
    onSuccess: (_, variables) => {
      setSessionManagement((current) =>
        current
          ? {
              ...current,
              sessions: current.sessions.filter(({ id }) => id !== variables.sessionId),
            }
          : current,
      );
    },
  });
  const setupQuery = useQuery<SetupStatus, ApiClientError>({
    queryFn: getSetupStatus,
    queryKey: ['setup', 'status'],
    retry: false,
  });
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: createdOwner?.email ?? '',
      password: '',
    },
    resolver: zodResolver(loginSchema),
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
    setErrorMessage('');
    revokeSessionMutation.reset();

    try {
      await login(values.email, values.password);
      router.replace('/app');
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 409) {
        const details = getSessionManagementDetails(error);
        if (details) {
          setSessionManagement(details);
          return;
        }
      }

      setSessionManagement(null);
      if (error instanceof ApiClientError && error.status === 401) {
        setErrorMessage('El correo o la contraseña no son válidos.');
      } else {
        setErrorMessage(
          'No pudimos iniciar sesión. Revisa la conexión e inténtalo de nuevo.',
        );
      }
    }
  };

  useEffect(() => {
    if (setupQuery.data?.installationStatus === 'PENDING') {
      router.replace('/setup');
    }
  }, [router, setupQuery.data?.installationStatus]);

  useEffect(() => {
    if (createdOwner) {
      queryClient.removeQueries({ queryKey: ['setup', 'createdOwner'] });
    }
  }, [createdOwner, queryClient]);

  if (setupQuery.isPending || setupQuery.data?.installationStatus === 'PENDING') {
    return (
      <main
        className={cn([
          'grid min-h-dvh place-items-center',
          'bg-background px-4 text-foreground',
        ])}
      >
        <p className={cn(['flex items-center gap-2 text-sm text-secondary'])}>
          <LoaderCircle aria-hidden="true" className={cn(['h-4 w-4 animate-spin'])} />
          Cargando Geedyx…
        </p>
      </main>
    );
  }

  if (setupQuery.isError || !setupQuery.data) {
    return (
      <main
        className={cn([
          'grid min-h-dvh place-items-center',
          'bg-background px-4 text-foreground',
        ])}
      >
        <div className={cn(['space-y-3 px-4 text-center'])}>
          <p className={cn(['text-sm text-danger'])}>
            No pudimos cargar Geedyx. Inténtalo de nuevo cuando la aplicación esté
            disponible.
          </p>
          <button
            className={cn([
              'inline-flex items-center justify-center rounded-full',
              'border border-border-strong px-3 py-1.5',
              'text-sm font-medium',
              'transition hover:bg-surface-subtle',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
            ])}
            onClick={() => setupQuery.refetch()}
            type="button"
          >
            Reintentar
          </button>
        </div>
      </main>
    );
  }

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
          'mx-auto flex max-w-sm flex-col justify-center',
          'min-h-[calc(100dvh-3rem)]',
        ])}
      >
        <div className={cn(['mb-6', 'flex items-center justify-between gap-4'])}>
          <BrandLogo />
          <ThemeToggle />
        </div>

        {createdOwner ? (
          <aside
            aria-live="polite"
            className={cn([
              'mb-4 space-y-1 rounded-xl border border-success/30',
              'bg-success/10 p-5 text-sm shadow-sm',
            ])}
            role="status"
          >
            <p className={cn(['font-semibold text-success-strong'])}>Cuenta creada</p>
            <p className={cn(['text-secondary'])}>
              La cuenta de {createdOwner.displayName} se creó correctamente. Inicia
              sesión con{' '}
              <strong className={cn(['break-all'])}>{createdOwner.email}</strong> y la
              contraseña que acabas de definir.
            </p>
          </aside>
        ) : null}

        {sessionManagement ? (
          <aside
            aria-live="polite"
            className={cn([
              'mb-4 space-y-4 rounded-xl border border-border',
              'bg-surface-subtle p-5 text-sm shadow-sm',
            ])}
          >
            <div className={cn(['space-y-1'])}>
              <p className={cn(['font-semibold'])}>Sesiones activas</p>
              <p className={cn(['text-secondary'])}>
                Tu cuenta ya tiene cinco sesiones activas. Revoca una para abrir esta
                sesión.
              </p>
            </div>
            <div className={cn(['space-y-2'])}>
              {sessionManagement.sessions.map((session) => (
                <div
                  className={cn([
                    'flex items-start justify-between gap-3 rounded-md',
                    'border border-border bg-surface p-3',
                  ])}
                  key={session.id}
                >
                  <div className={cn(['min-w-0 space-y-1'])}>
                    <p className={cn(['truncate font-medium'])}>
                      {session.userAgent ?? 'Dispositivo no identificado'}
                    </p>
                    <p className={cn(['text-xs text-muted'])}>
                      Última actividad:{' '}
                      {new Date(session.lastActivityAt).toLocaleString('es-HN')}
                    </p>
                  </div>
                  <button
                    className={cn([
                      'shrink-0 rounded-full border border-border-strong',
                      'px-3 py-1.5 text-xs font-medium',
                      'transition hover:bg-surface-subtle',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
                      'disabled:cursor-not-allowed disabled:opacity-60',
                    ])}
                    disabled={revokeSessionMutation.isPending}
                    onClick={() =>
                      revokeSessionMutation.mutate({
                        sessionId: session.id,
                        token: sessionManagement.token,
                      })
                    }
                    type="button"
                  >
                    Revocar
                  </button>
                </div>
              ))}
            </div>
            {sessionManagement.sessions.length === 0 ? (
              <p className={cn(['text-sm text-success-strong'])}>
                Sesión liberada. Puedes intentar iniciar sesión de nuevo.
              </p>
            ) : null}
            {revokeSessionMutation.error ? (
              <p className={cn(['text-sm text-danger'])} role="alert">
                No pudimos revocar esa sesión. Inténtalo de nuevo.
              </p>
            ) : null}
          </aside>
        ) : null}

        <section
          className={cn([
            'rounded-xl border border-border bg-surface',
            'p-5 shadow-sm',
            'sm:p-6',
          ])}
        >
          <div className={cn(['mb-6'])}>
            <h1 className={cn(['text-2xl font-semibold tracking-tight'])}>
              Inicia sesión
            </h1>
          </div>

          <form
            className={cn(['space-y-4'])}
            noValidate
            onSubmit={handleSubmit(onSubmit)}
          >
            <div className={cn(['space-y-1.5'])}>
              <label className={cn(['text-sm font-medium'])} htmlFor="email">
                Correo electrónico
              </label>
              <Input
                autoComplete="email"
                aria-describedby={errors.email ? 'email-error' : undefined}
                error={Boolean(errors.email)}
                id="email"
                placeholder="nombre@empresa.com"
                type="email"
                {...register('email')}
              />
              {errors.email ? (
                <p className={cn(['text-xs text-danger'])} id="email-error">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className={cn(['space-y-1.5'])}>
              <label className={cn(['text-sm font-medium'])} htmlFor="password">
                Contraseña
              </label>
              <Input
                autoComplete="current-password"
                aria-describedby={errors.password ? 'password-error' : undefined}
                error={Boolean(errors.password)}
                id="password"
                type="password"
                {...register('password')}
              />
              {errors.password ? (
                <p className={cn(['text-xs text-danger'])} id="password-error">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            {errorMessage ? (
              <p
                aria-live="polite"
                className={cn(['text-sm text-danger'])}
                role="alert"
              >
                {errorMessage}
              </p>
            ) : null}

            <button
              className={cn([
                'inline-flex w-full items-center justify-center gap-2 rounded-full',
                'bg-accent px-3 py-2',
                'text-sm font-medium text-accent-foreground',
                'transition hover:bg-accent-hover',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30',
                'disabled:cursor-not-allowed disabled:opacity-60',
              ])}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Validando acceso…' : 'Entrar'}
              <LogIn aria-hidden="true" className={cn(['h-4 w-4'])} />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
