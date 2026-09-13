"use client";

import { useRef, useState, type FormEvent } from "react";
import { ApiError, apiErrorMessage } from "@/lib/api/http";
import type {
  InternalUser,
  RoleSummary,
  UserInput,
  UserUpdateInput,
} from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, FieldLabel, Input, Select } from "@/components/ui/field";

const CHECKBOX_CLASS =
  "h-4 w-4 rounded border-border-strong text-accent focus:ring-accent/40";

interface UserFormDialogProps {
  user?: InternalUser;
  roles: RoleSummary[];
  onSave: (input: UserInput | UserUpdateInput) => Promise<void>;
  onClose: () => void;
}

export function UserFormDialog({
  user,
  roles,
  onSave,
  onClose,
}: UserFormDialogProps) {
  const usernameRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [locale, setLocale] = useState(user?.locale ?? "es");
  const [timeZone, setTimeZone] = useState(user?.timeZone ?? "UTC");
  const [status, setStatus] = useState<"ACTIVE" | "SUSPENDED">(
    user?.status ?? "ACTIVE",
  );
  const [roleIds, setRoleIds] = useState<string[]>(
    user?.roles.map((role) => role.id) ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isEdit = user !== undefined;
  const isOwner = user?.roles.some((role) => role.code === "OWNER") ?? false;

  function toggleRole(roleId: string): void {
    setRoleIds((current) =>
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanDisplayName = displayName.trim();
    if (roleIds.length === 0) {
      setError("Selecciona al menos un rol.");
      return;
    }
    if (!isEdit) {
      if (!username.trim() || !email.trim() || !password) {
        setError("Completa el usuario, correo y contraseña temporal.");
        return;
      }
      if (password.length < 12) {
        setError("La contraseña temporal debe tener al menos 12 caracteres.");
        return;
      }
    }

    setPending(true);
    setError(null);
    try {
      if (isEdit) {
        await onSave({
          displayName: cleanDisplayName || undefined,
          locale: locale.trim(),
          timeZone: timeZone.trim(),
          ...(isOwner ? {} : { status, roleIds }),
        });
      } else {
        await onSave({
          username: username.trim(),
          email: email.trim(),
          password,
          displayName: cleanDisplayName || undefined,
          roleIds,
        });
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setError("El usuario o correo ya está en uso.");
      } else {
        setError(apiErrorMessage(cause));
      }
      setPending(false);
    }
  }

  return (
    <Dialog
      title={isEdit ? "Editar usuario" : "Nuevo usuario"}
      description={
        isEdit
          ? "Actualiza el perfil, estado y roles internos."
          : "Crea una cuenta interna con una contraseña temporal."
      }
      onClose={onClose}
      initialFocusRef={usernameRef}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="user-form"
            variant="primary"
            loading={pending}
            loadingLabel="Guardando…"
          >
            {isEdit ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        {!isEdit ? (
          <fieldset className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="user-username">Usuario</FieldLabel>
              <Input
                ref={usernameRef}
                id="user-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
              />
            </div>
            <div>
              <FieldLabel htmlFor="user-email">Correo electrónico</FieldLabel>
              <Input
                id="user-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="user-password">Contraseña temporal</FieldLabel>
              <Input
                id="user-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-muted">
                Debe tener al menos 12 caracteres. El cambio obligatorio de contraseña llega en P1.4.
              </p>
            </div>
          </fieldset>
        ) : null}

        <fieldset className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor="user-display-name">Nombre visible</FieldLabel>
            <Input
              ref={isEdit ? usernameRef : undefined}
              id="user-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={user?.username ?? "Nombre para mostrar"}
            />
          </div>
          {isEdit && !isOwner ? (
            <div>
              <FieldLabel htmlFor="user-status">Estado</FieldLabel>
              <Select
                id="user-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "ACTIVE" | "SUSPENDED")
                }
              >
                <option value="ACTIVE">Activo</option>
                <option value="SUSPENDED">Suspendido</option>
              </Select>
            </div>
          ) : null}
          {isEdit ? (
            <>
              <div>
                <FieldLabel htmlFor="user-locale">Idioma</FieldLabel>
                <Input
                  id="user-locale"
                  value={locale}
                  onChange={(event) => setLocale(event.target.value)}
                />
              </div>
              <div>
                <FieldLabel htmlFor="user-time-zone">Zona horaria</FieldLabel>
                <Input
                  id="user-time-zone"
                  value={timeZone}
                  onChange={(event) => setTimeZone(event.target.value)}
                />
              </div>
            </>
          ) : null}
        </fieldset>

        {isOwner ? (
          <p className="text-sm text-muted">
            El propietario de instalación conserva su rol y estado para evitar perder el control de la empresa.
          </p>
        ) : (
          <fieldset>
            <legend className="text-sm font-medium text-foreground">Roles</legend>
            <div className="mt-2 space-y-2">
              {roles.map((role) => (
                <label key={role.id} className="flex items-start gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={roleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className={CHECKBOX_CLASS}
                  />
                  <span>
                    <span className="font-medium">{role.name}</span>
                    {role.description ? (
                      <span className="ml-1 text-muted">- {role.description}</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {error ? <FieldError>{error}</FieldError> : null}
      </form>
    </Dialog>
  );
}
