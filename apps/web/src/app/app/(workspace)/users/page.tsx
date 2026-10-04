'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Check, Copy, LoaderCircle, Plus, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { AuthSession, UserCreated, UsersResponse } from '@geedyx/contracts';
import {
  ConfirmDialog,
  Modal,
  useToast,
} from '../../../../components/feedback/feedback';
import { PaginationControls } from '../../../../components/data/pagination-controls';
import { Input } from '../../../../components/forms/input';
import { PageHeader } from '../../../../components/layout/page-header';
import {
  ApiClientError,
  createUser,
  getCurrentSession,
  getUsers,
  issueTemporaryPassword,
  updateUserStatus,
} from '../../../../lib/api-client';
import { cn } from '../../../../lib/cn';

const userSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Escribe el nombre visible.')
    .max(120, 'El nombre no puede superar 120 caracteres.'),
  email: z
    .string()
    .trim()
    .email('Escribe un correo electrónico válido.')
    .max(320, 'El correo no puede superar 320 caracteres.'),
});

type UserFormValues = z.infer<typeof userSchema>;

const sessionQueryKey = ['auth', 'session'];
const usersQueryKey = ['users'];

function statusLabel(status: string): string {
  if (status === 'ACTIVE') return 'Activo';
  if (status === 'DISABLED') return 'Desactivado';
  return 'Bloqueado';
}

export default function UsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdUser, setCreatedUser] = useState<UserCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pendingAction, setPendingAction] = useState<{
    type: 'activate' | 'disable' | 'lock' | 'temporary-password';
    userId: string;
    userName: string;
  } | null>(null);
  const { notify } = useToast();
  const sessionQuery = useQuery<AuthSession, ApiClientError>({
    queryFn: getCurrentSession,
    queryKey: sessionQueryKey,
  });
  const canReadUsers = Boolean(
    sessionQuery.data?.user.permissions.includes('users.read'),
  );
  const canManageUsers = Boolean(
    sessionQuery.data?.user.permissions.includes('users.manage'),
  );
  const usersQuery = useQuery<UsersResponse, ApiClientError>({
    enabled: canReadUsers,
    queryFn: () => getUsers({ page, pageSize }),
    queryKey: [...usersQueryKey, page, pageSize],
  });
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (result) => {
      setCreatedUser(result);
      setCopied(false);
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
    },
  });
  const statusMutation = useMutation({
    mutationFn: (payload: {
      status: 'ACTIVE' | 'DISABLED' | 'LOCKED';
      userId: string;
    }) =>
      updateUserStatus(payload.userId, {
        reason: 'Cambio de estado desde la administración de usuarios.',
        status: payload.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
      notify({
        message: 'El estado del usuario se actualizó.',
        title: 'Usuario actualizado',
        tone: 'success',
      });
      setPendingAction(null);
    },
  });
  const temporaryPasswordMutation = useMutation({
    mutationFn: (userId: string) =>
      issueTemporaryPassword(
        userId,
        'Regeneración desde la administración de usuarios.',
      ),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
      setCreatedUser(result);
      setCopied(false);
      notify({
        message: 'Entrega la contraseña temporal por un canal seguro.',
        title: 'Contraseña temporal generada',
        tone: 'success',
      });
      setPendingAction(null);
    },
  });
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<UserFormValues>({
    defaultValues: {
      displayName: '',
      email: '',
    },
    resolver: zodResolver(userSchema),
  });

  useEffect(() => {
    if (sessionQuery.error?.status === 401) {
      router.replace('/login');
    }
  }, [router, sessionQuery.error]);

  const onSubmit: SubmitHandler<UserFormValues> = async (values) => {
    setFormError('');
    setCreatedUser(null);
    setCopied(false);
    createMutation.reset();
    try {
      await createMutation.mutateAsync(values);
      reset();
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.problem?.code === 'USER_EMAIL_ALREADY_EXISTS'
      ) {
        setFormError('Ese correo ya está registrado.');
      } else {
        setFormError('No pudimos crear el usuario. Inténtalo de nuevo.');
      }
    }
  };

  const copyTemporaryPassword = async () => {
    if (!createdUser) return;
    await navigator.clipboard.writeText(createdUser.temporaryPassword);
    setCopied(true);
  };

  if (sessionQuery.isPending || sessionQuery.error?.status === 401) {
    return (
      <div
        className={cn([
          'grid min-h-48 place-items-center rounded-lg border border-border bg-surface',
        ])}
      >
        <p className={cn(['text-sm text-secondary'])}>Cargando usuarios…</p>
      </div>
    );
  }

  if (!sessionQuery.data || !canReadUsers) {
    return (
      <section
        className={cn([
          'mx-auto max-w-md space-y-3 rounded-lg border border-border bg-surface',
          'p-6 text-center shadow-sm',
        ])}
      >
        <h1 className={cn(['text-xl font-semibold'])}>Acceso restringido</h1>
        <p className={cn(['text-sm text-secondary'])}>
          No tienes permiso para consultar los usuarios.
        </p>
        <Link
          className={cn([
            'inline-flex items-center gap-2 text-sm font-medium text-accent',
            'hover:text-accent-hover',
          ])}
          href="/app/dashboard"
        >
          <ArrowLeft aria-hidden="true" className={cn(['h-4 w-4'])} />
          Volver al panel
        </Link>
      </section>
    );
  }

  return (
    <div className={cn(['space-y-6'])}>
      <PageHeader
        actions={
          canManageUsers ? (
            <button
              className={cn([
                'inline-flex items-center gap-2 rounded-full bg-accent px-3 py-2',
                'text-sm font-medium text-accent-foreground transition hover:bg-accent-hover',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30',
              ])}
              onClick={() => {
                setFormError('');
                createMutation.reset();
                setCreateOpen(true);
              }}
              type="button"
            >
              <Plus aria-hidden="true" className={cn(['h-4 w-4'])} />
              Crear usuario
            </button>
          ) : null
        }
        description="Consulta las cuentas de esta empresa y su estado actual."
        eyebrow="Usuarios"
        title="Usuarios"
      />

      <section
        className={cn([
          'space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm',
        ])}
      >
        <div className={cn(['flex items-start justify-between gap-4'])}>
          <div className={cn(['space-y-1'])}>
            <h2 className={cn(['text-lg font-semibold'])}>Usuarios registrados</h2>
            <p className={cn(['text-sm text-secondary'])}>
              Consulta las cuentas de esta empresa y su estado actual.
            </p>
          </div>
          <UserPlus aria-hidden="true" className={cn(['h-5 w-5 text-muted'])} />
        </div>

        {usersQuery.isPending ? (
          <p className={cn(['text-sm text-secondary'])}>Cargando cuentas…</p>
        ) : usersQuery.isError ? (
          <p className={cn(['text-sm text-danger'])} role="alert">
            No pudimos cargar los usuarios. Inténtalo de nuevo.
          </p>
        ) : usersQuery.data.users.length === 0 ? (
          <p
            className={cn([
              'rounded-lg border border-border p-4 text-sm text-secondary',
            ])}
          >
            Todavía no hay usuarios registrados.
          </p>
        ) : (
          <>
            <div className={cn(['space-y-3'])}>
              {usersQuery.data.users.map((user) => (
                <article
                  className={cn([
                    'rounded-lg border border-border bg-surface-subtle',
                    'p-4',
                  ])}
                  key={user.id}
                >
                  <div
                    className={cn(['flex flex-wrap items-start justify-between gap-3'])}
                  >
                    <div className={cn(['min-w-0'])}>
                      <h3 className={cn(['truncate font-medium'])}>
                        {user.displayName}
                      </h3>
                      <p className={cn(['mt-1 break-all text-sm text-secondary'])}>
                        {user.email}
                      </p>
                    </div>
                    <span
                      className={cn([
                        'rounded-full px-2.5 py-1 text-xs font-medium',
                        user.status === 'ACTIVE'
                          ? 'bg-success/10 text-success-strong'
                          : 'bg-warning/10 text-warning-strong',
                      ])}
                    >
                      {statusLabel(user.status)}
                    </span>
                  </div>
                  <div
                    className={cn([
                      'mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted',
                    ])}
                  >
                    <span>Roles: {user.roles.join(', ') || 'Sin rol asignado'}</span>
                    {user.passwordChangeRequired ? (
                      <span>Primer acceso pendiente</span>
                    ) : null}
                    <span>
                      Creado{' '}
                      {format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: es })}
                    </span>
                  </div>
                  {canManageUsers ? (
                    <div className={cn(['mt-4 flex flex-wrap gap-2'])}>
                      {user.id !== sessionQuery.data.user.id ? (
                        <button
                          className={cn([
                            'rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium',
                            'transition hover:bg-surface',
                          ])}
                          onClick={() =>
                            setPendingAction({
                              type: user.status === 'ACTIVE' ? 'disable' : 'activate',
                              userId: user.id,
                              userName: user.displayName,
                            })
                          }
                          type="button"
                        >
                          {user.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                        </button>
                      ) : null}
                      {user.id !== sessionQuery.data.user.id ? (
                        <button
                          className={cn([
                            'rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium',
                            'transition hover:bg-surface',
                          ])}
                          onClick={() =>
                            setPendingAction({
                              type: 'temporary-password',
                              userId: user.id,
                              userName: user.displayName,
                            })
                          }
                          type="button"
                        >
                          Generar contraseña temporal
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
            <PaginationControls
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPage(1);
                setPageSize(nextPageSize);
              }}
              pagination={usersQuery.data.pagination}
            />
          </>
        )}
      </section>

      <Modal
        description="Geedyx generará una contraseña temporal para entregar por un canal seguro."
        footer={
          <>
            <button
              className={cn([
                'rounded-full border border-border-strong px-3 py-2 text-sm font-medium',
                'transition hover:bg-surface-subtle',
              ])}
              onClick={() => setCreateOpen(false)}
              type="button"
            >
              Cancelar
            </button>
            <button
              className={cn([
                'inline-flex items-center justify-center gap-2 rounded-full bg-accent px-3 py-2',
                'text-sm font-medium text-accent-foreground transition hover:bg-accent-hover',
                'disabled:cursor-not-allowed disabled:opacity-60',
              ])}
              disabled={createMutation.isPending}
              form="user-create-form"
              type="submit"
            >
              {createMutation.isPending ? (
                <LoaderCircle
                  aria-hidden="true"
                  className={cn(['h-4 w-4 animate-spin'])}
                />
              ) : null}
              {createMutation.isPending ? 'Creando…' : 'Crear usuario'}
            </button>
          </>
        }
        onClose={() => setCreateOpen(false)}
        open={createOpen}
        size="lg"
        title="Crear usuario"
      >
        <form
          aria-busy={createMutation.isPending}
          className={cn(['space-y-5'])}
          id="user-create-form"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className={cn(['grid gap-5 sm:grid-cols-2'])}>
            <div className={cn(['space-y-1.5'])}>
              <label className={cn(['text-sm font-medium'])} htmlFor="displayName">
                Nombre visible
              </label>
              <Input
                aria-describedby={errors.displayName ? 'display-name-error' : undefined}
                autoComplete="name"
                error={Boolean(errors.displayName)}
                id="displayName"
                {...register('displayName')}
              />
              {errors.displayName ? (
                <p className={cn(['text-xs text-danger'])} id="display-name-error">
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
                type="email"
                {...register('email')}
              />
              {errors.email ? (
                <p className={cn(['text-xs text-danger'])} id="email-error">
                  {errors.email.message}
                </p>
              ) : null}
            </div>
          </div>
          {formError ? (
            <p aria-live="polite" className={cn(['text-sm text-danger'])} role="alert">
              {formError}
            </p>
          ) : null}
        </form>
      </Modal>

      {createdUser ? (
        <aside
          aria-live="polite"
          className={cn([
            'space-y-3 rounded-xl border border-success/30 bg-success/10',
            'p-5 shadow-sm',
          ])}
          role="status"
        >
          <div className={cn(['space-y-1'])}>
            <p className={cn(['font-semibold text-success-strong'])}>Usuario creado</p>
            <p className={cn(['text-sm text-secondary'])}>
              Entrega esta contraseña temporal a {createdUser.user.displayName}. Solo se
              mostrará en este momento y vence el{' '}
              {format(
                new Date(createdUser.temporaryPasswordExpiresAt),
                'dd/MM/yyyy HH:mm',
                {
                  locale: es,
                },
              )}
              .
            </p>
          </div>
          <div className={cn(['flex flex-wrap items-center gap-3'])}>
            <code
              className={cn([
                'rounded-md border border-success/30 bg-surface px-3 py-2',
                'font-mono text-sm tracking-wide',
              ])}
            >
              {createdUser.temporaryPassword}
            </code>
            <button
              className={cn([
                'inline-flex items-center gap-2 rounded-full border border-border-strong',
                'px-3 py-2 text-sm font-medium transition hover:bg-surface',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
              ])}
              onClick={copyTemporaryPassword}
              type="button"
            >
              {copied ? (
                <Check aria-hidden="true" className={cn(['h-4 w-4'])} />
              ) : (
                <Copy aria-hidden="true" className={cn(['h-4 w-4'])} />
              )}
              {copied ? 'Copiada' : 'Copiar'}
            </button>
          </div>
        </aside>
      ) : null}

      <ConfirmDialog
        confirmLabel={
          pendingAction?.type === 'temporary-password' ? 'Generar' : 'Confirmar'
        }
        description={
          pendingAction?.type === 'temporary-password'
            ? `Se revocarán las sesiones de ${pendingAction.userName} y deberá cambiar la nueva contraseña al entrar.`
            : `Confirma el cambio de estado de ${pendingAction?.userName ?? 'este usuario'}.`
        }
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (!pendingAction) return;
          if (pendingAction.type === 'temporary-password') {
            temporaryPasswordMutation.mutate(pendingAction.userId);
            return;
          }
          statusMutation.mutate({
            status: pendingAction.type === 'activate' ? 'ACTIVE' : 'DISABLED',
            userId: pendingAction.userId,
          });
        }}
        open={Boolean(pendingAction)}
        pending={statusMutation.isPending || temporaryPasswordMutation.isPending}
        title={
          pendingAction?.type === 'temporary-password'
            ? '¿Generar contraseña temporal?'
            : '¿Cambiar estado del usuario?'
        }
      />
    </div>
  );
}
