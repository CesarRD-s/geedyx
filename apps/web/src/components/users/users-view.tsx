"use client";

import { useMemo, useState } from "react";
import { Pencil, UserPlus, Users } from "lucide-react";
import {
  createUser,
  listUsers,
  updateUser,
} from "@/lib/api/client";
import type {
  InternalUser,
  Paginated,
  RoleSummary,
  UserInput,
  UserUpdateInput,
} from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Select, FieldLabel } from "@/components/ui/field";
import {
  errorBannerClass,
  mobileListClass,
  rowHoverClass,
  successBannerClass,
  tableWrapClass,
  tdClass,
  theadRowClass,
  thClass,
  tbodyRowClass,
} from "@/components/ui/styles";
import { UserFormDialog } from "./user-form-dialog";

type DialogState = { mode: "create" } | { mode: "edit"; user: InternalUser } | null;

export function UsersView({
  initialPage,
  roles,
  canManage,
}: {
  initialPage: Paginated<InternalUser>;
  roles: RoleSummary[];
  canManage: boolean;
}) {
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    "" | "ACTIVE" | "INVITED" | "SUSPENDED"
  >("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const users = useMemo(() => page.data, [page]);

  async function refresh(): Promise<void> {
    const nextPage = await listUsers({
      page: 1,
      limit: 20,
      search: search.trim() || undefined,
      status: status || undefined,
    });
    setPage(nextPage);
  }

  async function applyFilters(): Promise<void> {
    setError(null);
    try {
      await refresh();
    } catch {
      setError("No se pudo actualizar la lista de usuarios.");
    }
  }

  async function handleSave(input: UserInput | UserUpdateInput): Promise<void> {
    if (dialog?.mode === "edit") {
      if (!isUserUpdateInput(input)) {
        return;
      }
      await updateUser(dialog.user.id, input);
      setBanner("Usuario actualizado.");
    } else {
      if (!isUserInput(input)) {
        return;
      }
      await createUser(input);
      setBanner("Invitación creada.");
    }
    await refresh();
    setDialog(null);
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Usuarios"
        description="Gestiona las cuentas internas, su estado y los roles asignados."
        action={
          canManage ? (
            <Button variant="primary" onClick={() => setDialog({ mode: "create" })}>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Nuevo usuario
            </Button>
          ) : undefined
        }
      />

      {banner ? <p role="status" className={successBannerClass}>{banner}</p> : null}
      {error ? <p role="alert" className={errorBannerClass}>{error}</p> : null}

      <div className="flex flex-wrap items-end gap-3">
        <SearchInput
          id="user-search"
          label="Buscar usuarios"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nombre, usuario o correo…"
          className="w-full max-w-sm"
        />
        <div className="w-full sm:w-44">
          <FieldLabel htmlFor="user-status-filter">Estado</FieldLabel>
          <Select
            id="user-status-filter"
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value as
                  | ""
                  | "ACTIVE"
                  | "INVITED"
                  | "SUSPENDED",
              )
            }
          >
            <option value="">Todos</option>
            <option value="ACTIVE">Activo</option>
            <option value="INVITED">Invitado pendiente</option>
            <option value="SUSPENDED">Suspendido</option>
          </Select>
        </div>
        <Button variant="secondary" onClick={applyFilters}>Aplicar</Button>
        <p className="text-sm text-muted">{page.meta.total} usuarios</p>
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
          title="Sin usuarios"
          description="No encontramos usuarios con los filtros actuales."
          action={
            canManage ? (
              <Button variant="primary" onClick={() => setDialog({ mode: "create" })}>
                Nuevo usuario
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul className={mobileListClass}>
            {users.map((user) => <UserMobileRow key={user.id} user={user} canManage={canManage} onEdit={() => setDialog({ mode: "edit", user })} />)}
          </ul>
          <div className={tableWrapClass}>
            <table className="hidden w-full text-sm sm:table">
              <caption className="sr-only">Lista de usuarios internos</caption>
              <thead><tr className={theadRowClass}>
                <th className={thClass}>Usuario</th><th className={thClass}>Roles</th><th className={thClass}>Estado</th><th className={`${thClass} text-right`}>Acciones</th>
              </tr></thead>
              <tbody className={tbodyRowClass}>
                {users.map((user) => (
                  <tr key={user.id} className={rowHoverClass}>
                    <td className={tdClass}><p className="font-medium text-foreground">{user.displayName ?? user.username}</p><p className="text-xs text-muted">{user.email}</p></td>
                    <td className={tdClass}><span className="text-sm text-secondary">{user.roles.map((role) => role.name).join(", ")}</span></td>
                    <td className={tdClass}><StatusBadge status={user.status} /></td>
                    <td className={tdClass}><div className="flex justify-end gap-1">{canManage ? <IconButton label={`Editar usuario ${user.username}`} tooltip="Editar" onClick={() => setDialog({ mode: "edit", user })}><Pencil className="h-4 w-4" aria-hidden="true" /></IconButton> : null}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {dialog ? <UserFormDialog user={dialog.mode === "edit" ? dialog.user : undefined} roles={roles} onSave={handleSave} onClose={() => setDialog(null)} /> : null}
    </section>
  );
}

function UserMobileRow({ user, canManage, onEdit }: { user: InternalUser; canManage: boolean; onEdit: () => void }) {
  return <li className="flex items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{user.displayName ?? user.username}</p><p className="truncate text-xs text-muted">{user.email}</p><div className="mt-1"><StatusBadge status={user.status} /></div></div>{canManage ? <IconButton label={`Editar usuario ${user.username}`} tooltip="Editar" onClick={onEdit}><Pencil className="h-4 w-4" aria-hidden="true" /></IconButton> : null}</li>;
}

function StatusBadge({ status }: { status: InternalUser["status"] }) {
  if (status === "ACTIVE") {
    return <Badge tone="success">Activo</Badge>;
  }
  if (status === "INVITED") {
    return <Badge tone="warning">Invitado pendiente</Badge>;
  }
  return <Badge tone="danger">Suspendido</Badge>;
}

function isUserInput(input: UserInput | UserUpdateInput): input is UserInput {
  return "username" in input;
}

function isUserUpdateInput(
  input: UserInput | UserUpdateInput,
): input is UserUpdateInput {
  return !("username" in input);
}
