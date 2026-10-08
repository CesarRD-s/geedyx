'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
  UserRoundCog,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type {
  AuthSession,
  PermissionOption,
  RoleSummary,
  RolesResponse,
  UsersResponse,
} from '@geedyx/contracts';
import { dataTableHeaderTextClassName } from '../../../../../components/data/data-table-frame';
import { PaginationControls } from '../../../../../components/data/pagination-controls';
import { RowActionsMenu } from '../../../../../components/data/row-actions-menu';
import {
  ConfirmDialog,
  FeedbackAlert,
  Modal,
  useToast,
} from '../../../../../components/feedback/feedback';
import { Input } from '../../../../../components/forms/input';
import { PageHeader } from '../../../../../components/layout/page-header';
import { RoleEditorModal } from '../../../../../components/users/role-editor-modal';
import {
  ApiClientError,
  createRole,
  deleteRole,
  getCurrentSession,
  getRoles,
  getUsers,
  updateRole,
  updateUserRoles,
} from '../../../../../lib/api-client';
import { cn } from '../../../../../lib/cn';

const sessionQueryKey = ['auth', 'session'];
const usersQueryKey = ['users'];
const rolesQueryKey = ['users', 'roles'];

function permissionGroups(
  role: RoleSummary,
  permissions: PermissionOption[],
): { key: string; label: string; permissions: PermissionOption[] }[] {
  const grouped = new Map<string, PermissionOption[]>();
  for (const permission of permissions) {
    if (!role.permissions.includes(permission.code)) continue;
    const current = grouped.get(permission.moduleKey) ?? [];
    grouped.set(permission.moduleKey, [...current, permission]);
  }
  return [...grouped.entries()].map(([key, modulePermissions]) => ({
    key,
    label: modulePermissions[0]?.moduleLabel ?? key,
    permissions: modulePermissions,
  }));
}

export default function RolesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [profileOpen, setProfileOpen] = useState(false);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<RoleSummary | null>(null);
  const [profileError, setProfileError] = useState('');
  const [roleToDelete, setRoleToDelete] = useState<RoleSummary | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [currentPassword, setCurrentPassword] = useState('');
  const [reason, setReason] = useState('');
  const [assignmentError, setAssignmentError] = useState('');

  const sessionQuery = useQuery<AuthSession, ApiClientError>({
    queryFn: getCurrentSession,
    queryKey: sessionQueryKey,
  });
  const canManageRoles = Boolean(
    sessionQuery.data?.user.permissions.includes('roles.manage'),
  );
  const usersQuery = useQuery<UsersResponse, ApiClientError>({
    enabled: canManageRoles,
    queryFn: () => getUsers({ page, pageSize }),
    queryKey: [...usersQueryKey, page, pageSize],
  });
  const rolesQuery = useQuery<RolesResponse, ApiClientError>({
    enabled: canManageRoles,
    queryFn: getRoles,
    queryKey: rolesQueryKey,
  });
  const effectiveUserId = selectedUserId || usersQuery.data?.users[0]?.id || '';
  const selectedUser = usersQuery.data?.users.find(
    (user) => user.id === effectiveUserId,
  );
  const effectiveRoles = selectedUserId ? selectedRoles : (selectedUser?.roles ?? []);
  const ownerSensitive = Boolean(
    selectedUser?.roles.includes('OWNER') || effectiveRoles.includes('OWNER'),
  );
  const actorIsOwner = Boolean(sessionQuery.data?.user.roles.includes('OWNER'));

  const saveProfileMutation = useMutation({
    mutationFn: (payload: {
      roleId: string | null;
      description: string;
      name: string;
      permissionCodes: string[];
    }) => {
      const rolePayload = {
        description: payload.description,
        name: payload.name,
        permissionCodes: payload.permissionCodes,
      };
      return payload.roleId
        ? updateRole(payload.roleId, rolePayload)
        : createRole(rolePayload);
    },
    onSuccess: (_role, variables) => {
      queryClient.invalidateQueries({ queryKey: rolesQueryKey });
      setProfileOpen(false);
      setEditingRole(null);
      setProfileError('');
      notify({
        message: variables.roleId
          ? 'Los cambios del perfil se guardaron.'
          : 'El perfil de acceso se creó.',
        title: 'Perfil guardado',
        tone: 'success',
      });
    },
    onError: (error) => {
      setProfileError(
        error instanceof ApiClientError
          ? error.message
          : 'No pudimos guardar el perfil. Inténtalo de nuevo.',
      );
    },
  });
  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) => deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesQueryKey });
      setRoleToDelete(null);
      setDeleteError('');
      notify({
        message: 'El perfil de acceso se eliminó.',
        title: 'Perfil eliminado',
        tone: 'success',
      });
    },
    onError: (error) => {
      setDeleteError(
        error instanceof ApiClientError
          ? error.message
          : 'No pudimos eliminar el perfil.',
      );
    },
  });
  const updateMutation = useMutation({
    mutationFn: () =>
      updateUserRoles(effectiveUserId, {
        currentPassword: ownerSensitive ? currentPassword : undefined,
        reason: ownerSensitive
          ? reason.trim()
          : 'Actualización de accesos desde la consola.',
        roleCodes: effectiveRoles,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
      setAssignOpen(false);
      setCurrentPassword('');
      setReason('');
      setAssignmentError('');
      notify({
        message: 'Los accesos de la cuenta se actualizaron.',
        title: 'Accesos guardados',
        tone: 'success',
      });
    },
    onError: (error) => {
      setAssignmentError(
        error instanceof ApiClientError
          ? error.message
          : 'No pudimos actualizar los accesos.',
      );
    },
  });

  useEffect(() => {
    if (sessionQuery.error?.status === 401) router.replace('/login');
  }, [router, sessionQuery.error]);

  if (
    sessionQuery.isPending ||
    (canManageRoles && (usersQuery.isPending || rolesQuery.isPending))
  ) {
    return <p className={cn(['text-sm text-secondary'])}>Cargando accesos…</p>;
  }
  if (!sessionQuery.data || !canManageRoles) {
    return (
      <FeedbackAlert tone="error">
        Tu cuenta no puede administrar los perfiles de acceso.
      </FeedbackAlert>
    );
  }
  if (
    usersQuery.isError ||
    rolesQuery.isError ||
    !usersQuery.data ||
    !rolesQuery.data
  ) {
    return (
      <FeedbackAlert tone="error">
        No pudimos cargar las cuentas y sus perfiles de acceso.
      </FeedbackAlert>
    );
  }

  const permissions = rolesQuery.data.permissions;
  const roleOrder = ['OWNER', 'ADMIN', 'USER'];
  const orderedRoles = [...rolesQuery.data.roles].sort((first, second) => {
    if (first.isSystem !== second.isSystem) return first.isSystem ? -1 : 1;
    if (first.isSystem && second.isSystem) {
      return roleOrder.indexOf(first.code) - roleOrder.indexOf(second.code);
    }
    return first.name.localeCompare(second.name, 'es');
  });

  return (
    <div className={cn(['space-y-6'])}>
      <PageHeader
        actions={
          <>
            <button
              className={cn([
                'inline-flex items-center gap-2 rounded-full border border-border-strong',
                'px-3 py-2 text-sm font-medium transition hover:bg-surface-subtle',
              ])}
              onClick={() => {
                setSelectedUserId('');
                setSelectedRoles([]);
                setCurrentPassword('');
                setReason('');
                setAssignmentError('');
                setAssignOpen(true);
              }}
              type="button"
            >
              <UserRoundCog aria-hidden="true" className={cn(['h-4 w-4'])} />
              Asignar accesos
            </button>
            <button
              className={cn([
                'inline-flex items-center gap-2 rounded-full bg-accent px-3 py-2',
                'text-sm font-medium text-accent-foreground transition hover:bg-accent-hover',
              ])}
              onClick={() => {
                setEditingRole(null);
                setProfileError('');
                saveProfileMutation.reset();
                setProfileOpen(true);
              }}
              type="button"
            >
              <Plus aria-hidden="true" className={cn(['h-4 w-4'])} />
              Crear perfil
            </button>
          </>
        }
        description="Define qué puede hacer cada persona según su puesto."
        eyebrow="Equipo"
        title="Administrar accesos"
      />

      <section
        className={cn(['overflow-hidden rounded-xl border border-border bg-surface'])}
      >
        <div
          className={cn([
            'flex items-center border-b border-border bg-surface-subtle px-5 py-2',
          ])}
        >
          <h2
            className={cn(['min-w-0 flex-1 font-medium', dataTableHeaderTextClassName])}
          >
            Perfiles disponibles
          </h2>
          <span aria-hidden="true" className={cn(['h-8 w-8 shrink-0'])} />
        </div>
        {rolesQuery.data.roles.length === 0 ? (
          <p className={cn(['px-4 py-4 text-sm text-secondary'])}>
            Todavía no hay perfiles de acceso.
          </p>
        ) : (
          <div className={cn(['divide-y divide-border'])}>
            {orderedRoles.map((role) => {
              const groups = permissionGroups(role, permissions);
              const isExpanded = expandedRoleId === role.id;
              const headerId = `access-profile-heading-${role.id}`;
              const panelId = `access-profile-${role.id}`;

              return (
                <article
                  className={cn(['transition-colors hover:bg-surface-subtle'])}
                  key={role.id}
                >
                  <div className={cn(['flex items-center pr-5'])}>
                    <button
                      aria-controls={panelId}
                      aria-expanded={isExpanded}
                      className={cn([
                        'flex min-w-0 flex-1 items-center gap-3 py-4 pl-5 pr-3 text-left',
                        'focus-visible:outline-none focus-visible:ring-2',
                        'focus-visible:ring-accent/40',
                      ])}
                      onClick={() =>
                        setExpandedRoleId((current) =>
                          current === role.id ? null : role.id,
                        )
                      }
                      id={headerId}
                      type="button"
                    >
                      <ChevronDown
                        aria-hidden="true"
                        className={cn([
                          'h-4 w-4 shrink-0 text-muted transition-transform',
                          isExpanded ? 'rotate-180' : '',
                        ])}
                      />
                      <span className={cn(['min-w-0 space-y-1'])}>
                        <span className={cn(['flex flex-wrap items-center gap-2'])}>
                          <span className={cn(['truncate font-semibold'])}>
                            {role.name}
                          </span>
                          <span
                            className={cn([
                              'shrink-0 rounded-full bg-accent-muted px-2 py-0.5',
                              'text-xs text-accent',
                            ])}
                          >
                            {role.isSystem ? 'Perfil base' : 'Personalizado'}
                          </span>
                        </span>
                        <span
                          className={cn(['flex flex-wrap gap-x-4 text-xs text-muted'])}
                        >
                          <span>Aplica a toda la empresa</span>
                          <span>
                            Asignado a {role.memberCount}{' '}
                            {role.memberCount === 1 ? 'cuenta' : 'cuentas'}
                          </span>
                        </span>
                      </span>
                    </button>
                    {!role.isSystem ? (
                      <RowActionsMenu
                        accessibleName={`Acciones para ${role.name}`}
                        items={[
                          {
                            Icon: Pencil,
                            label: 'Editar perfil',
                            onSelect: () => {
                              setEditingRole(role);
                              setProfileError('');
                              saveProfileMutation.reset();
                              setProfileOpen(true);
                            },
                          },
                          {
                            Icon: Trash2,
                            label: 'Eliminar perfil',
                            disabled: role.memberCount > 0,
                            onSelect: () => {
                              setRoleToDelete(role);
                              setDeleteError('');
                              deleteRoleMutation.reset();
                            },
                            tone: 'danger',
                          },
                        ]}
                      />
                    ) : (
                      <span aria-hidden="true" className={cn(['h-8 w-8 shrink-0'])} />
                    )}
                  </div>
                  {isExpanded ? (
                    <div
                      aria-labelledby={headerId}
                      className={cn(['space-y-4 border-t border-border px-4 py-4'])}
                      id={panelId}
                      role="region"
                    >
                      <div className={cn(['space-y-1'])}>
                        <p className={cn(['text-sm text-secondary'])}>
                          {role.description}
                        </p>
                      </div>
                      <div className={cn(['grid gap-4 sm:grid-cols-2 xl:grid-cols-3'])}>
                        {groups.length === 0 ? (
                          <p className={cn(['text-sm text-secondary'])}>
                            Este perfil no tiene acciones disponibles.
                          </p>
                        ) : (
                          groups.map((group) => (
                            <div className={cn(['space-y-1.5'])} key={group.key}>
                              <h4 className={cn(['text-xs font-semibold text-muted'])}>
                                {group.label}
                              </h4>
                              <ul className={cn(['space-y-1'])}>
                                {group.permissions.map((permission) => (
                                  <li
                                    className={cn(['text-sm text-secondary'])}
                                    key={permission.code}
                                  >
                                    {permission.label}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <RoleEditorModal
        error={profileError}
        initialRole={editingRole}
        key={`${editingRole?.id ?? 'new'}-${profileOpen ? 'open' : 'closed'}`}
        onClose={() => {
          setProfileOpen(false);
          setEditingRole(null);
        }}
        onSubmit={(payload) =>
          saveProfileMutation.mutate({
            ...payload,
            roleId: editingRole?.id ?? null,
          })
        }
        open={profileOpen}
        permissions={permissions}
        saving={saveProfileMutation.isPending}
      />

      <Modal
        description="Elige uno o varios perfiles. Si combinas perfiles, sus acciones se suman."
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
              disabled={
                !effectiveUserId ||
                effectiveRoles.length === 0 ||
                updateMutation.isPending ||
                (ownerSensitive && !actorIsOwner) ||
                (ownerSensitive &&
                  (currentPassword.length === 0 || reason.trim().length < 3))
              }
              form="access-assignment-form"
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
              Guardar accesos
            </button>
          </>
        }
        onClose={() => setAssignOpen(false)}
        open={assignOpen}
        size="lg"
        title="Asignar perfiles"
      >
        <form
          className={cn(['space-y-5'])}
          id="access-assignment-form"
          onSubmit={(event) => {
            event.preventDefault();
            setAssignmentError('');
            if (effectiveRoles.length === 0) {
              setAssignmentError('Selecciona al menos un perfil de acceso.');
              return;
            }
            if (ownerSensitive && !actorIsOwner) {
              setAssignmentError(
                'Solo el Propietario de la empresa puede cambiar el acceso de otro propietario.',
              );
              return;
            }
            if (
              ownerSensitive &&
              (currentPassword.length === 0 || reason.trim().length < 3)
            ) {
              setAssignmentError(
                'Confirma tu contraseña actual y escribe el motivo de la acción.',
              );
              return;
            }
            updateMutation.mutate();
          }}
        >
          {usersQuery.data.users.length === 0 ? (
            <p className={cn(['text-sm text-secondary'])}>
              Crea primero una cuenta para poder asignarle un perfil.
            </p>
          ) : (
            <>
              <label className={cn(['block space-y-1.5 text-sm font-medium'])}>
                Cuenta
                <select
                  className={selectStyles}
                  onChange={(event) => {
                    const nextUser = usersQuery.data.users.find(
                      (user) => user.id === event.target.value,
                    );
                    setSelectedUserId(event.target.value);
                    setSelectedRoles(nextUser?.roles ?? []);
                    setCurrentPassword('');
                    setReason('');
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
              <PaginationControls
                onPageChange={(nextPage) => {
                  setSelectedUserId('');
                  setSelectedRoles([]);
                  setPage(nextPage);
                }}
                onPageSizeChange={(nextPageSize) => {
                  setSelectedUserId('');
                  setSelectedRoles([]);
                  setPage(1);
                  setPageSize(nextPageSize);
                }}
                pagination={usersQuery.data.pagination}
              />
              <fieldset className={cn(['space-y-2'])}>
                <legend className={cn(['mb-2 text-sm font-medium'])}>
                  Perfiles disponibles
                </legend>
                {rolesQuery.data.roles.map((role) => (
                  <label
                    className={cn([
                      'flex items-start gap-3 rounded-xl border border-border',
                      'bg-surface-subtle p-3 text-sm',
                    ])}
                    key={role.id}
                  >
                    <input
                      checked={effectiveRoles.includes(role.code)}
                      className={cn(['mt-0.5 h-4 w-4 accent-accent'])}
                      disabled={role.code === 'OWNER' && !actorIsOwner}
                      onChange={(event) => {
                        setSelectedRoles((current) =>
                          event.target.checked
                            ? [...current, role.code]
                            : current.filter((code) => code !== role.code),
                        );
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
              </fieldset>
              {usersQuery.data.users.length > 0 && ownerSensitive && actorIsOwner ? (
                <div
                  className={cn(['space-y-4 rounded-xl border border-warning/30 p-4'])}
                >
                  <p className={cn(['text-sm text-secondary'])}>
                    Los cambios que afectan al Propietario de la empresa requieren
                    confirmar tu contraseña y registrar el motivo.
                  </p>
                  <label
                    className={cn(['block space-y-1.5 text-sm font-medium'])}
                    htmlFor="owner-action-password"
                  >
                    Contraseña actual
                    <Input
                      autoComplete="current-password"
                      id="owner-action-password"
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      type="password"
                      value={currentPassword}
                    />
                  </label>
                  <label
                    className={cn(['block space-y-1.5 text-sm font-medium'])}
                    htmlFor="owner-action-reason"
                  >
                    Motivo
                    <Input
                      id="owner-action-reason"
                      maxLength={240}
                      onChange={(event) => setReason(event.target.value)}
                      value={reason}
                    />
                  </label>
                </div>
              ) : null}
            </>
          )}
          {ownerSensitive && !actorIsOwner ? (
            <FeedbackAlert tone="warning">
              Solo el Propietario de la empresa puede asignar o cambiar ese perfil.
            </FeedbackAlert>
          ) : null}
          {assignmentError ? (
            <FeedbackAlert tone="error">{assignmentError}</FeedbackAlert>
          ) : null}
        </form>
      </Modal>

      <ConfirmDialog
        confirmLabel={deleteRoleMutation.isPending ? 'Eliminando…' : 'Eliminar perfil'}
        description={
          roleToDelete
            ? `Se eliminará el perfil «${roleToDelete.name}». Esta acción no se puede deshacer.`
            : ''
        }
        onCancel={() => setRoleToDelete(null)}
        onConfirm={() => {
          if (roleToDelete) deleteRoleMutation.mutate(roleToDelete.id);
        }}
        open={Boolean(roleToDelete)}
        pending={deleteRoleMutation.isPending}
        title="Eliminar perfil de acceso"
      >
        {deleteError ? <FeedbackAlert tone="error">{deleteError}</FeedbackAlert> : null}
      </ConfirmDialog>
    </div>
  );
}

const selectStyles = cn([
  'w-full rounded-xl border border-input-border bg-input px-3 py-2.5 text-sm',
  'text-foreground focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20',
]);
