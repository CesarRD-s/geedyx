'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import { cn } from '../../lib/cn';
import { Input } from './input';

export const setupOwnerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, 'Escribe tu nombre.')
      .max(120, 'El nombre no puede superar 120 caracteres.'),
    email: z
      .string()
      .trim()
      .email('Escribe un correo electrónico válido.')
      .max(320, 'El correo no puede superar 320 caracteres.'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres.')
      .regex(
        /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
        'Incluye una mayúscula, un número y un carácter especial.',
      ),
    passwordConfirmation: z.string().min(1, 'Confirma la contraseña.'),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: 'Las contraseñas no coinciden.',
    path: ['passwordConfirmation'],
  });

export type SetupOwnerFormValues = z.infer<typeof setupOwnerSchema>;

type SetupOwnerFormProps = {
  isSubmitting: boolean;
  serverError: string;
  onSubmit: SubmitHandler<SetupOwnerFormValues>;
};

export function SetupOwnerForm({
  isSubmitting,
  onSubmit,
  serverError,
}: SetupOwnerFormProps) {
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<SetupOwnerFormValues>({
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      passwordConfirmation: '',
    },
    resolver: zodResolver(setupOwnerSchema),
  });

  return (
    <form className={cn(['space-y-4'])} noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className={cn(['space-y-1.5'])}>
        <label className={cn(['text-sm font-medium'])} htmlFor="displayName">
          Nombre visible
        </label>
        <Input
          aria-describedby={errors.displayName ? 'displayName-error' : undefined}
          autoComplete="name"
          error={Boolean(errors.displayName)}
          id="displayName"
          placeholder="Tu nombre"
          type="text"
          {...register('displayName')}
        />
        {errors.displayName ? (
          <p className={cn(['text-xs text-danger'])} id="displayName-error">
            {errors.displayName.message}
          </p>
        ) : null}
      </div>

      <div className={cn(['space-y-1.5'])}>
        <label className={cn(['text-sm font-medium'])} htmlFor="email">
          Correo electrónico
        </label>
        <Input
          aria-describedby={errors.email ? 'email-error' : undefined}
          autoComplete="email"
          error={Boolean(errors.email)}
          id="email"
          placeholder="owner@empresa.com"
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
          aria-describedby={errors.password ? 'password-error' : 'password-help'}
          autoComplete="new-password"
          error={Boolean(errors.password)}
          id="password"
          type="password"
          {...register('password')}
        />
        <p className={cn(['text-xs text-muted'])} id="password-help">
          Mínimo 8 caracteres, una mayúscula, un número y un carácter especial.
        </p>
        {errors.password ? (
          <p className={cn(['text-xs text-danger'])} id="password-error">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <div className={cn(['space-y-1.5'])}>
        <label className={cn(['text-sm font-medium'])} htmlFor="passwordConfirmation">
          Confirmar contraseña
        </label>
        <Input
          aria-describedby={
            errors.passwordConfirmation ? 'password-confirmation-error' : undefined
          }
          autoComplete="new-password"
          error={Boolean(errors.passwordConfirmation)}
          id="passwordConfirmation"
          type="password"
          {...register('passwordConfirmation')}
        />
        {errors.passwordConfirmation ? (
          <p className={cn(['text-xs text-danger'])} id="password-confirmation-error">
            {errors.passwordConfirmation.message}
          </p>
        ) : null}
      </div>

      {serverError ? (
        <p aria-live="polite" className={cn(['text-sm text-danger'])} role="alert">
          {serverError}
        </p>
      ) : null}

      <button
        className={cn([
          'inline-flex w-full items-center justify-center rounded-md',
          'bg-accent px-4 py-2.5',
          'text-sm font-medium text-accent-foreground',
          'transition hover:bg-accent-hover',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30',
          'disabled:cursor-not-allowed disabled:opacity-60',
        ])}
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
    </form>
  );
}
