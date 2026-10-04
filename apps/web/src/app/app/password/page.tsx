'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { AuthSession } from '@geedyx/contracts';
import { BrandLogo } from '../../../components/brand/brand-logo';
import { Input } from '../../../components/forms/input';
import { ThemeToggle } from '../../../components/theme/theme-toggle';
import {
  ApiClientError,
  changePassword,
  getCurrentSession,
} from '../../../lib/api-client';
import { cn } from '../../../lib/cn';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Escribe tu contraseña actual.'),
    newPassword: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres.')
      .regex(
        /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
        'Incluye una mayúscula, un número y un carácter especial.',
      ),
    confirmation: z.string().min(1, 'Confirma tu nueva contraseña.'),
  })
  .refine((values) => values.newPassword === values.confirmation, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmation'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

const sessionQueryKey = ['auth', 'session'];

export default function PasswordPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState('');
  const sessionQuery = useQuery<AuthSession, ApiClientError>({
    queryFn: getCurrentSession,
    queryKey: sessionQueryKey,
  });
  const passwordMutation = useMutation({
    mutationFn: (values: PasswordFormValues) =>
      changePassword(values.currentPassword, values.newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      router.replace('/app');
    },
  });
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<PasswordFormValues>({
    defaultValues: {
      confirmation: '',
      currentPassword: '',
      newPassword: '',
    },
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    if (sessionQuery.error?.status === 401) {
      router.replace('/login');
      return;
    }
    if (sessionQuery.data && !sessionQuery.data.user.passwordChangeRequired) {
      router.replace('/app');
    }
  }, [router, sessionQuery.data, sessionQuery.error]);

  const onSubmit: SubmitHandler<PasswordFormValues> = async (values) => {
    setErrorMessage('');
    passwordMutation.reset();
    try {
      await passwordMutation.mutateAsync(values);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setErrorMessage('La contraseña actual no es válida.');
      } else {
        setErrorMessage('No pudimos cambiar la contraseña. Inténtalo de nuevo.');
      }
    }
  };

  if (
    sessionQuery.isPending ||
    sessionQuery.error?.status === 401 ||
    !sessionQuery.data?.user.passwordChangeRequired
  ) {
    return (
      <main
        className={cn([
          'grid min-h-dvh place-items-center',
          'bg-background px-4 text-foreground',
        ])}
      >
        <p className={cn(['text-sm text-secondary'])}>Cargando seguridad…</p>
      </main>
    );
  }

  return (
    <main
      className={cn(['min-h-dvh bg-background text-foreground', 'px-4 py-6 sm:px-6'])}
    >
      <div className={cn(['mx-auto max-w-md'])}>
        <header className={cn(['mb-6 flex items-center justify-between gap-4'])}>
          <BrandLogo />
          <ThemeToggle />
        </header>

        <section
          className={cn([
            'space-y-6 rounded-xl border border-border bg-surface',
            'p-5 shadow-sm sm:p-7',
          ])}
        >
          <div className={cn(['flex items-start gap-3'])}>
            <span
              className={cn([
                'grid h-10 w-10 shrink-0 place-items-center rounded-full',
                'bg-warning/10 text-warning',
              ])}
            >
              <ShieldCheck aria-hidden="true" className={cn(['h-5 w-5'])} />
            </span>
            <div className={cn(['space-y-1'])}>
              <h1 className={cn(['text-xl font-semibold tracking-tight'])}>
                Cambia tu contraseña
              </h1>
              <p className={cn(['text-sm text-secondary'])}>
                Esta contraseña temporal debe cambiarse antes de continuar.
              </p>
            </div>
          </div>

          <form
            aria-busy={passwordMutation.isPending}
            className={cn(['space-y-4'])}
            noValidate
            onSubmit={handleSubmit(onSubmit)}
          >
            <div className={cn(['space-y-1.5'])}>
              <label className={cn(['text-sm font-medium'])} htmlFor="currentPassword">
                Contraseña temporal
              </label>
              <Input
                aria-describedby={
                  errors.currentPassword ? 'current-password-error' : undefined
                }
                autoComplete="current-password"
                error={Boolean(errors.currentPassword)}
                id="currentPassword"
                type="password"
                {...register('currentPassword')}
              />
              {errors.currentPassword ? (
                <p className={cn(['text-xs text-danger'])} id="current-password-error">
                  {errors.currentPassword.message}
                </p>
              ) : null}
            </div>

            <div className={cn(['space-y-1.5'])}>
              <label className={cn(['text-sm font-medium'])} htmlFor="newPassword">
                Nueva contraseña
              </label>
              <Input
                aria-describedby={
                  errors.newPassword ? 'new-password-error' : 'new-password-help'
                }
                autoComplete="new-password"
                error={Boolean(errors.newPassword)}
                id="newPassword"
                type="password"
                {...register('newPassword')}
              />
              <p className={cn(['text-xs text-muted'])} id="new-password-help">
                Mínimo 8 caracteres, una mayúscula, un número y un carácter especial.
              </p>
              {errors.newPassword ? (
                <p className={cn(['text-xs text-danger'])} id="new-password-error">
                  {errors.newPassword.message}
                </p>
              ) : null}
            </div>

            <div className={cn(['space-y-1.5'])}>
              <label className={cn(['text-sm font-medium'])} htmlFor="confirmation">
                Confirmar nueva contraseña
              </label>
              <Input
                aria-describedby={
                  errors.confirmation ? 'confirmation-error' : undefined
                }
                autoComplete="new-password"
                error={Boolean(errors.confirmation)}
                id="confirmation"
                type="password"
                {...register('confirmation')}
              />
              {errors.confirmation ? (
                <p className={cn(['text-xs text-danger'])} id="confirmation-error">
                  {errors.confirmation.message}
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
                'inline-flex w-full items-center justify-center rounded-full',
                'bg-accent px-3 py-2 text-sm font-medium text-accent-foreground',
                'transition hover:bg-accent-hover',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30',
                'disabled:cursor-not-allowed disabled:opacity-60',
              ])}
              disabled={passwordMutation.isPending}
              type="submit"
            >
              {passwordMutation.isPending ? (
                <LoaderCircle
                  aria-hidden="true"
                  className={cn(['mr-2 h-4 w-4 animate-spin'])}
                />
              ) : null}
              {passwordMutation.isPending ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
