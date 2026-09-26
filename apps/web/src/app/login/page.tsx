'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { SetupStatus } from '@geedyx/contracts';
import { BrandLogo } from '../../components/brand/brand-logo';
import { Input } from '../../components/forms/input';
import { ThemeToggle } from '../../components/theme/theme-toggle';
import { ApiClientError, getSetupStatus, login } from '../../lib/api-client';
import { cn } from '../../lib/cn';

const loginSchema = z.object({
  email: z.string().email('Escribe un correo electrónico válido.'),
  password: z.string().min(1, 'Escribe tu contraseña.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState('');
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
      email: '',
      password: '',
    },
    resolver: zodResolver(loginSchema),
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
    setErrorMessage('');

    try {
      await login(values.email, values.password);
      router.replace('/app');
    } catch (error) {
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

  if (setupQuery.isPending || setupQuery.data?.installationStatus === 'PENDING') {
    return (
      <main
        className={cn([
          'grid min-h-dvh place-items-center',
          'bg-background px-4 text-foreground',
        ])}
      >
        <p className={cn(['text-sm text-secondary'])}>Preparando Geedyx…</p>
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
            No pudimos preparar Geedyx. Inténtalo de nuevo cuando la aplicación esté
            disponible.
          </p>
          <button
            className={cn([
              'inline-flex items-center justify-center rounded-md',
              'border border-border-strong px-4 py-2',
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
                'inline-flex w-full items-center justify-center gap-2 rounded-md',
                'bg-accent px-4 py-2.5',
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
