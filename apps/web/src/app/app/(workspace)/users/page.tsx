'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  Check,
  Copy,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Plus,
  UserRoundCheck,
  UserRoundX,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { type SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import type {
  AuthSession,
  RolesResponse,
  UserCreated,
  UsersResponse,
} from '@geedyx/contracts';
import {
  ConfirmDialog,
  Modal,
  useToast,
} from '../../../../components/feedback/feedback';
import {
  DataTableFrame,
  dataTableHeaderCellClassName,
  dataTableHeaderRowClassName,
} from '../../../../components/data/data-table-frame';
import { PaginationControls } from '../../../../components/data/pagination-controls';
import { RowActionsMenu } from '../../../../components/data/row-actions-menu';
import { Input } from '../../../../components/forms/input';
import { PageHeader } from '../../../../components/layout/page-header';
import {
  ApiClientError,
  createUser,
  getCurrentSession,
  getRoles,
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
  roleCodes: z.array(z.string()).min(1, 'Selecciona al menos un perfil de acceso.'),
});

type UserFormValues = z.infer<typeof userSchema>;

const sessionQueryKey = ['auth', 'session'];
const usersQueryKey = ['users'];
const rolesQueryKey = ['users', 'roles'];

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
  const [pageSize, setPageSize] = useState(10);
  const [actionPassword, setActionPassword] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [createOwnerPassword, setCreateOwnerPassword] = useState('');
  const [createOwnerReason, setCreateOwnerReason] = useState('');
  const [actionError, setActionError] = useState('');
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
  const canManageRoles = Boolean(
    sessionQuery.data?.user.permissions.includes('roles.manage'),
  );
  const canCreateUsers = canManageUsers && canManageRoles;
  const actorIsOwner = Boolean(sessionQuery.data?.user.roles.includes('OWNER'));
  const usersQuery = useQuery<UsersResponse, ApiClientError>({
    enabled: canReadUsers,
    queryFn: () => getUsers({ page, pageSize }),
    queryKey: [...usersQueryKey, page, pageSize],
  });
  const rolesQuery = useQuery<RolesResponse, ApiClientError>({
    enabled: canCreateUsers,
    queryFn: getRoles,
    queryKey: rolesQueryKey,
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
      currentPassword?: string;
      reason: string;
      status: 'ACTIVE' | 'DISABLED' | 'LOCKED';
      userId: string;
    }) =>
      updateUserStatus(payload.userId, {
        currentPassword: payload.currentPassword,
        reason: payload.reason,
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
      setActionPassword('');
      setActionReason('');
      setActionError('');
    },
    onError: (error) => {
      setActionError(
        error instanceof ApiClientError
          ? error.message
          : 'No pudimos actualizar el usuario. Inténtalo de nuevo.',
      );
    },
  });
  const temporaryPasswordMutation = useMutation({
    mutationFn: (payload: {
      currentPassword?: string;
      reason: string;
      userId: string;
    }) =>
      issueTemporaryPassword(payload.userId, payload.reason, payload.currentPassword),
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
      setActionPassword('');
      setActionReason('');
      setActionError('');
    },
    onError: (error) => {
      setActionError(
        error instanceof ApiClientError
          ? error.message
          : 'No pudimos generar la contraseña temporal.',
      );
    },
  });
  const {
    formState: { errors },
    handleSubmit,
    control,
    register,
    reset,
    setValue,
  } = useForm<UserFormValues>({
    defaultValues: {
      displayName: '',
      email: '',
      roleCodes: [],
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
    if (values.roleCodes.includes('OWNER') && !actorIsOwner) {
      setFormError('Solo el Propietario de la empresa puede asignar ese perfil.');
      return;
    }
    if (
      values.roleCodes.includes('OWNER') &&
      (createOwnerPassword.length === 0 || createOwnerReason.trim().length < 3)
    ) {
      setFormError(
        'Confirma tu contraseña actual y escribe el motivo para asignar ese perfil.',
      );
      return;
    }
    try {
      await createMutation.mutateAsync({
        ...values,
        currentPassword: values.roleCodes.includes('OWNER')
          ? createOwnerPassword
          : undefined,
        reason: values.roleCodes.includes('OWNER')
          ? createOwnerReason.trim()
          : undefined,
      });
      reset();
      setCreateOwnerPassword('');
      setCreateOwnerReason('');
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.problem?.code === 'USER_EMAIL_ALREADY_EXISTS'
      ) {
        setFormError('Ese correo ya está registrado.');
      } else if (
        error instanceof ApiClientError &&
        error.problem?.code === 'ROLE_MANAGEMENT_REQUIRED'
      ) {
        setFormError('Tu cuenta no puede asignar perfiles de acceso.');
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

  const openPendingAction = (action: NonNullable<typeof pendingAction>) => {
    setActionPassword('');
    setActionReason('');
    setActionError('');
    setPendingAction(action);
  };

  const pendingUser = usersQuery.data?.users.find(
    (user) => user.id === pendingAction?.userId,
  );
  const ownerAction = Boolean(pendingUser?.roles.includes('OWNER'));
  const selectedCreateRoleCodes = useWatch({
    control,
    name: 'roleCodes',
  });
  const selectedCreateRoles =
    rolesQuery.data?.roles.filter((role) =>
      selectedCreateRoleCodes.includes(role.code),
    ) ?? [];
  const selectedCreatePermissionCodes = new Set(
    selectedCreateRoles.flatMap((role) => role.permissions),
  );
  const selectedCreateModules = [
    ...new Set(
      (rolesQuery.data?.permissions ?? [])
        .filter((permission) => selectedCreatePermissionCodes.has(permission.code))
        .map((permission) => permission.moduleLabel),
    ),
  ];

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
          Tu cuenta no tiene acceso para consultar los usuarios.
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
          canCreateUsers ? (
            <button
              className={cn([
                'inline-flex items-center gap-2 rounded-full bg-accent px-3 py-2',
                'text-sm font-medium text-accent-foreground transition hover:bg-accent-hover',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30',
              ])}
              onClick={() => {
                setFormError('');
                createMutation.reset();
                reset({
                  displayName: '',
                  email: '',
                  roleCodes: [],
                });
                setCreateOwnerPassword('');
                setCreateOwnerReason('');
                setCreateOpen(true);
              }}
              type="button"
            >
              <Plus aria-hidden="true" className={cn(['h-4 w-4'])} />
              Crear usuario
            </button>
          ) : null
        }
        eyebrow="Administración"
        title="Usuarios"
      />

      {usersQuery.isPending ? (
        <p className={cn(['py-5 text-sm text-secondary'])}>Cargando cuentas…</p>
      ) : usersQuery.isError ? (
        <p className={cn(['py-5 text-sm text-danger'])} role="alert">
          No pudimos cargar los usuarios. Inténtalo de nuevo.
        </p>
      ) : usersQuery.data.users.length === 0 ? (
        <p className={cn(['py-5 text-sm text-secondary'])}>
          Todavía no hay usuarios registrados.
        </p>
      ) : (
        <DataTableFrame
          ariaLabel="Cuentas de usuario"
          footer={
            <PaginationControls
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPage(1);
                setPageSize(nextPageSize);
              }}
              pagination={usersQuery.data.pagination}
            />
          }
          tableClassName="min-w-[900px]"
        >
          <thead className={dataTableHeaderRowClassName}>
            <tr>
              <th
                className={cn([dataTableHeaderCellClassName, 'min-w-60'])}
                scope="col"
              >
                Cuenta
              </th>
              <th
                className={cn([dataTableHeaderCellClassName, 'min-w-48'])}
                scope="col"
              >
                Perfil de acceso
              </th>
              <th
                className={cn([dataTableHeaderCellClassName, 'min-w-40'])}
                scope="col"
              >
                Estado
              </th>
              <th
                className={cn([dataTableHeaderCellClassName, 'min-w-36'])}
                scope="col"
              >
                Fecha de alta
              </th>
              <th
                className={cn([dataTableHeaderCellClassName, 'min-w-28 text-right'])}
                scope="col"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {usersQuery.data.users.map((user) => {
              const canActOnUser =
                canManageUsers &&
                user.id !== sessionQuery.data.user.id &&
                (!user.roles.includes('OWNER') || actorIsOwner);
              const userActionItems =
                user.status === 'ACTIVE'
                  ? [
                      {
                        Icon: UserRoundX,
                        label: 'Desactivar',
                        onSelect: () =>
                          openPendingAction({
                            type: 'disable',
                            userId: user.id,
                            userName: user.displayName,
                          }),
                      },
                      {
                        Icon: LockKeyhole,
                        label: 'Bloquear',
                        onSelect: () =>
                          openPendingAction({
                            type: 'lock',
                            userId: user.id,
                            userName: user.displayName,
                          }),
                      },
                      {
                        Icon: KeyRound,
                        label: 'Generar contraseña temporal',
                        onSelect: () =>
                          openPendingAction({
                            type: 'temporary-password',
                            userId: user.id,
                            userName: user.displayName,
                          }),
                      },
                    ]
                  : [
                      {
                        Icon: UserRoundCheck,
                        label: 'Activar',
                        onSelect: () =>
                          openPendingAction({
                            type: 'activate',
                            userId: user.id,
                            userName: user.displayName,
                          }),
                      },
                      {
                        Icon: KeyRound,
                        label: 'Generar contraseña temporal',
                        onSelect: () =>
                          openPendingAction({
                            type: 'temporary-password',
                            userId: user.id,
                            userName: user.displayName,
                          }),
                      },
                    ];

              return (
                <tr
                  className={cn(['border-t border-border align-middle'])}
                  key={user.id}
                >
                  <td className={cn(['px-5 py-4 align-middle'])}>
                    <div className={cn(['min-w-0'])}>
                      <p className={cn(['font-medium'])}>{user.displayName}</p>
                      <p className={cn(['mt-1 break-all text-sm text-secondary'])}>
                        {user.email}
                      </p>
                    </div>
                  </td>
                  <td className={cn(['px-5 py-4 align-middle text-secondary'])}>
                    {user.roleNames.join(', ') || 'Sin perfil asignado'}
                  </td>
                  <td className={cn(['px-5 py-4 align-middle'])}>
                    <div className={cn(['flex flex-col items-start'])}>
                      <span
                        className={cn([
                          'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                          user.status === 'ACTIVE'
                            ? 'bg-success/10 text-success-strong'
                            : 'bg-warning/10 text-warning-strong',
                        ])}
                      >
                        {statusLabel(user.status)}
                      </span>
                      {user.passwordChangeRequired ? (
                        <span className={cn(['mt-1 text-xs text-warning-strong'])}>
                          Primer acceso pendiente
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className={cn(['whitespace-nowrap px-5 py-4 align-middle'])}>
                    <time
                      className={cn(['text-sm text-secondary'])}
                      dateTime={user.createdAt}
                    >
                      {format(new Date(user.createdAt), 'dd/MM/yyyy', {
                        locale: es,
                      })}
                    </time>
                  </td>
                  <td className={cn(['px-5 py-4 text-right align-middle'])}>
                    {canActOnUser ? (
                      <div className={cn(['flex justify-end'])}>
                        <RowActionsMenu
                          accessibleName={`Acciones para ${user.displayName}`}
                          items={userActionItems}
                        />
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTableFrame>
      )}

      <Modal
        description="Asigna los perfiles de acceso junto con la cuenta. Geedyx generará una contraseña temporal que deberá cambiarse al entrar."
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
              disabled={
                createMutation.isPending || rolesQuery.isPending || !rolesQuery.data
              }
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
          {rolesQuery.data ? (
            <fieldset className={cn(['space-y-2'])}>
              <legend className={cn(['mb-1 text-sm font-medium'])}>
                Perfiles de acceso
              </legend>
              <p className={cn(['mb-2 text-xs text-secondary'])}>
                Elige uno o varios perfiles. Si eliges varios, sus accesos se suman.
              </p>
              {rolesQuery.data.roles.map((role) => (
                <label
                  className={cn([
                    'flex items-start gap-3 rounded-xl border border-border',
                    'bg-surface-subtle p-3 text-sm',
                  ])}
                  key={role.id}
                >
                  <input
                    checked={selectedCreateRoleCodes.includes(role.code)}
                    className={cn(['mt-0.5 h-4 w-4 accent-accent'])}
                    disabled={role.code === 'OWNER' && !actorIsOwner}
                    onChange={(event) => {
                      const nextCodes = event.target.checked
                        ? [...selectedCreateRoleCodes, role.code]
                        : selectedCreateRoleCodes.filter((code) => code !== role.code);
                      setValue('roleCodes', nextCodes, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    type="checkbox"
                  />
                  <span className={cn(['space-y-0.5'])}>
                    <span className={cn(['block font-medium'])}>{role.name}</span>
                    <span className={cn(['block text-xs text-secondary'])}>
                      {role.description}
                    </span>
                  </span>
                </label>
              ))}
              {errors.roleCodes ? (
                <p className={cn(['text-xs text-danger'])}>
                  {errors.roleCodes.message}
                </p>
              ) : null}
              {selectedCreateRoles.length > 0 ? (
                <div
                  className={cn([
                    'rounded-xl border border-accent/20 bg-accent-muted p-3',
                    'text-sm text-secondary',
                  ])}
                >
                  <p className={cn(['font-medium text-foreground'])}>
                    Acceso en toda la empresa
                  </p>
                  <p className={cn(['mt-1'])}>
                    {selectedCreateModules.length > 0
                      ? `Podrá usar: ${selectedCreateModules.join(', ')}.`
                      : 'Los perfiles seleccionados no tienen acciones disponibles.'}
                  </p>
                </div>
              ) : null}
            </fieldset>
          ) : rolesQuery.isError ? (
            <p className={cn(['text-sm text-danger'])} role="alert">
              No pudimos cargar los perfiles de acceso. Inténtalo de nuevo.
            </p>
          ) : (
            <p className={cn(['text-sm text-secondary'])}>
              Cargando perfiles de acceso…
            </p>
          )}
          {selectedCreateRoleCodes.includes('OWNER') && actorIsOwner ? (
            <div className={cn(['space-y-4 rounded-xl border border-warning/30 p-4'])}>
              <p className={cn(['text-sm text-secondary'])}>
                Asignar la titularidad de la empresa requiere confirmar tu contraseña y
                registrar el motivo.
              </p>
              <label
                className={cn(['block space-y-1.5 text-sm font-medium'])}
                htmlFor="create-owner-password"
              >
                Contraseña actual
                <Input
                  autoComplete="current-password"
                  id="create-owner-password"
                  onChange={(event) => setCreateOwnerPassword(event.target.value)}
                  type="password"
                  value={createOwnerPassword}
                />
              </label>
              <label
                className={cn(['block space-y-1.5 text-sm font-medium'])}
                htmlFor="create-owner-reason"
              >
                Motivo
                <Input
                  id="create-owner-reason"
                  maxLength={240}
                  onChange={(event) => setCreateOwnerReason(event.target.value)}
                  value={createOwnerReason}
                />
              </label>
            </div>
          ) : null}
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
          pendingAction?.type === 'temporary-password'
            ? 'Generar'
            : pendingAction?.type === 'lock'
              ? 'Bloquear'
              : 'Confirmar'
        }
        description={
          ownerAction
            ? `Esta acción sobre ${pendingAction?.userName ?? 'el Propietario de la empresa'} requiere confirmar tu identidad y registrar el motivo.`
            : pendingAction?.type === 'temporary-password'
              ? `Se revocarán las sesiones de ${pendingAction.userName} y deberá cambiar la nueva contraseña al entrar.`
              : pendingAction?.type === 'lock'
                ? `Se bloqueará la cuenta de ${pendingAction.userName} y se revocarán sus sesiones activas.`
                : `Confirma el cambio de estado de ${pendingAction?.userName ?? 'este usuario'}.`
        }
        onCancel={() => {
          setPendingAction(null);
          setActionPassword('');
          setActionReason('');
          setActionError('');
        }}
        onConfirm={() => {
          if (!pendingAction) return;
          const reason = ownerAction
            ? actionReason.trim()
            : pendingAction.type === 'temporary-password'
              ? 'Regeneración desde la administración de usuarios.'
              : 'Cambio de estado desde la administración de usuarios.';
          if (ownerAction && actionPassword.length === 0) {
            setActionError('Escribe tu contraseña actual.');
            return;
          }
          if (ownerAction && reason.length < 3) {
            setActionError('Escribe un motivo de al menos 3 caracteres.');
            return;
          }
          if (pendingAction.type === 'temporary-password') {
            temporaryPasswordMutation.mutate({
              currentPassword: ownerAction ? actionPassword : undefined,
              reason,
              userId: pendingAction.userId,
            });
            return;
          }
          const status =
            pendingAction.type === 'activate'
              ? 'ACTIVE'
              : pendingAction.type === 'lock'
                ? 'LOCKED'
                : 'DISABLED';
          statusMutation.mutate({
            currentPassword: ownerAction ? actionPassword : undefined,
            reason,
            status,
            userId: pendingAction.userId,
          });
        }}
        open={Boolean(pendingAction)}
        pending={statusMutation.isPending || temporaryPasswordMutation.isPending}
        title={
          ownerAction
            ? 'Confirmar acción sobre el Propietario de la empresa'
            : pendingAction?.type === 'temporary-password'
              ? '¿Generar contraseña temporal?'
              : pendingAction?.type === 'lock'
                ? '¿Bloquear usuario?'
                : '¿Cambiar estado del usuario?'
        }
      >
        {ownerAction || actionError ? (
          <div className={cn(['space-y-4'])}>
            {ownerAction ? (
              <>
                <label className={cn(['block space-y-1.5 text-sm font-medium'])}>
                  Contraseña actual
                  <Input
                    autoComplete="current-password"
                    onChange={(event) => setActionPassword(event.target.value)}
                    type="password"
                    value={actionPassword}
                  />
                </label>
                <label className={cn(['block space-y-1.5 text-sm font-medium'])}>
                  Motivo de la acción
                  <Input
                    maxLength={240}
                    onChange={(event) => setActionReason(event.target.value)}
                    value={actionReason}
                  />
                </label>
              </>
            ) : null}
            {actionError ? (
              <p className={cn(['text-sm text-danger'])} role="alert">
                {actionError}
              </p>
            ) : null}
          </div>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
