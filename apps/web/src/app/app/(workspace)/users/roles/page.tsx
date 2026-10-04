'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Plus, Save, UserRoundCog } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { AuthSession, RolesResponse, UsersResponse } from '@geedyx/contracts';
import {
  FeedbackAlert,
  Modal,
  useToast,
} from '../../../../../components/feedback/feedback';
import { PageHeader } from '../../../../../components/layout/page-header';
import {
  ApiClientError,
  getCurrentSession,
  getRoles,
  getUsers,
  updateUserRoles,
} from '../../../../../lib/api-client';
import { cn } from '../../../../../lib/cn';

const sessionQueryKey = ['auth', 'session'];
const usersQueryKey = ['users'];
const rolesQueryKey = ['users', 'roles'];

export default function RolesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const sessionQuery = useQuery<AuthSession, ApiClientError>({
    queryFn: getCurrentSession,
    queryKey: sessionQueryKey,
  });
  const canManage = Boolean(
    sessionQuery.data?.user.permissions.includes('roles.manage'),
  );
  const usersQuery = useQuery<UsersResponse, ApiClientError>({
    enabled: canManage,
    queryFn: () => getUsers({ page: 1, pageSize: 100 }),
    queryKey: usersQueryKey,
  });
  const rolesQuery = useQuery<RolesResponse, ApiClientError>({
    enabled: canManage,
    queryFn: getRoles,
    queryKey: rolesQueryKey,
  });
  const effectiveUserId = selectedUserId || usersQuery.data?.users[0]?.id || '';
  const effectiveRoles = selectedUserId
    ? selectedRoles
    : (usersQuery.data?.users[0]?.roles ?? []);
  const updateMutation = useMutation({
    mutationFn: () =>
      updateUserRoles(effectiveUserId, {
        reason: 'Administración de roles desde la consola.',
        roleCodes: effectiveRoles,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
      setAssignOpen(false);
      notify({
        message: 'Los roles del usuario se actualizaron.',
        title: 'Roles guardados',
        tone: 'success',
      });
    },
  });

  useEffect(() => {
    if (sessionQuery.error?.status === 401) router.replace('/login');
  }, [router, sessionQuery.error]);

  if (sessionQuery.isPending || usersQuery.isPending || rolesQuery.isPending) {
    return <p className={cn(['text-sm text-secondary'])}>Cargando roles…</p>;
  }
  if (!sessionQuery.data || !canManage) {
    return (
      <FeedbackAlert tone="error">
        No tienes permiso para administrar roles.
      </FeedbackAlert>
    );
  }
  if (usersQuery.isError || rolesQuery.isError) {
    return (
      <FeedbackAlert tone="error">
        No pudimos cargar los roles y usuarios.
      </FeedbackAlert>
    );
  }

  return (
    <div className={cn(['space-y-6'])}>
      <PageHeader
        actions={
          <button
            className={cn([
              'inline-flex items-center gap-2 rounded-full bg-accent px-3 py-2',
              'text-sm font-medium text-accent-foreground transition hover:bg-accent-hover',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30',
            ])}
            onClick={() => setAssignOpen(true)}
            type="button"
          >
            <Plus aria-hidden="true" className={cn(['h-4 w-4'])} />
            Asignar roles
          </button>
        }
        description="Asigna roles del sistema según la responsabilidad de cada cuenta."
        eyebrow="Seguridad"
        title="Roles y permisos"
      />

      <section
        className={cn([
          'space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm',
        ])}
      >
        <div className={cn(['space-y-1'])}>
          <h2 className={cn(['text-lg font-semibold'])}>Roles disponibles</h2>
          <p className={cn(['text-sm text-secondary'])}>
            Los permisos se validan siempre en el API.
          </p>
        </div>
        <div className={cn(['space-y-3'])}>
          {rolesQuery.data.roles.map((role) => (
            <article
              className={cn(['rounded-xl border border-border bg-surface-subtle p-4'])}
              key={role.id}
            >
              <div className={cn(['flex items-start justify-between gap-3'])}>
                <div>
                  <h3 className={cn(['font-medium'])}>{role.name}</h3>
                  <p className={cn(['mt-1 text-xs text-muted'])}>{role.code}</p>
                </div>
                {role.isSystem ? (
                  <span
                    className={cn([
                      'rounded-full bg-accent-muted px-2 py-1 text-xs text-accent',
                    ])}
                  >
                    Sistema
                  </span>
                ) : null}
              </div>
              <p className={cn(['mt-3 text-sm text-secondary'])}>
                {role.permissions.length} permisos asignados
              </p>
            </article>
          ))}
        </div>
      </section>

      <Modal
        description="Selecciona una cuenta y define los permisos que debe tener."
        footer={
          <>
            <button
              className={cn([
                'rounded-full border border-border-strong px-3 py-2 text-sm font-medium',
                'transition hover:bg-surface-subtle',
              ])}
              onClick={() => setAssignOpen(false)}
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
              disabled={!effectiveUserId || updateMutation.isPending}
              form="roles-assignment-form"
              type="submit"
            >
              {updateMutation.isPending ? (
                <LoaderCircle
                  aria-hidden="true"
                  className={cn(['h-4 w-4 animate-spin'])}
                />
              ) : (
                <Save aria-hidden="true" className={cn(['h-4 w-4'])} />
              )}
              Guardar roles
            </button>
          </>
        }
        onClose={() => setAssignOpen(false)}
        open={assignOpen}
        size="lg"
        title="Asignar roles"
      >
        <form
          className={cn(['space-y-6'])}
          id="roles-assignment-form"
          onSubmit={(event) => {
            event.preventDefault();
            updateMutation.mutate();
          }}
        >
          <div
            className={cn(['flex items-start gap-3 rounded-xl bg-accent-muted p-4'])}
          >
            <UserRoundCog aria-hidden="true" className={cn(['h-5 w-5 text-accent'])} />
            <p className={cn(['text-sm text-secondary'])}>
              Los permisos se validan siempre en el API antes de aplicar los cambios.
            </p>
          </div>
          <label
            className={cn(['block space-y-1.5 text-sm font-medium'])}
            htmlFor="userId"
          >
            Usuario
            <select
              className={selectStyles}
              id="userId"
              onChange={(event) => {
                const nextUser = usersQuery.data.users.find(
                  (user) => user.id === event.target.value,
                );
                setSelectedUserId(event.target.value);
                setSelectedRoles(nextUser?.roles ?? []);
              }}
              value={effectiveUserId}
            >
              {usersQuery.data.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName} · {user.email}
                </option>
              ))}
            </select>
          </label>
          <fieldset className={cn(['grid gap-3 sm:grid-cols-2'])}>
            <legend className={cn(['mb-2 text-sm font-medium sm:col-span-2'])}>
              Roles
            </legend>
            {rolesQuery.data.roles.map((role) => (
              <label
                className={cn([
                  'flex items-center gap-3 rounded-xl border border-border bg-surface-subtle p-3',
                  'text-sm',
                ])}
                key={role.id}
              >
                <input
                  checked={effectiveRoles.includes(role.code)}
                  className={cn(['h-4 w-4 accent-accent'])}
                  onChange={(event) => {
                    setSelectedRoles((current) =>
                      event.target.checked
                        ? [...current, role.code]
                        : current.filter((code) => code !== role.code),
                    );
                  }}
                  type="checkbox"
                />
                {role.name}
              </label>
            ))}
          </fieldset>
        </form>
      </Modal>
    </div>
  );
}

const selectStyles = cn([
  'w-full rounded-xl border border-input-border bg-input px-3 py-2.5 text-sm',
  'text-foreground focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20',
]);
