"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  changePassword,
  listSessions,
  revokeOtherSessions,
  revokeSession,
} from "@/lib/api/client";
import type { SessionSummary } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, FieldLabel, Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";

export function SecurityView() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function refresh(): Promise<void> {
    setSessions(await listSessions());
  }
  useEffect(() => {
    let active = true;
    void listSessions()
      .then((value) => {
        if (active) setSessions(value);
      })
      .catch(() => {
        if (active) setError("No se pudieron cargar las sesiones.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function handlePassword(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await changePassword({ currentPassword, newPassword });
      setChangeOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Contraseña actualizada. Las demás sesiones fueron cerradas.");
      await refresh();
    } catch {
      setError("No se pudo actualizar la contraseña.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Seguridad"
        description="Gestiona tu contraseña y sesiones activas."
        action={
          <Button
            onClick={() => {
              setError(null);
              setChangeOpen(true);
            }}
          >
            Cambiar contraseña
          </Button>
        }
      />
      {message ? (
        <p role="status" className="text-sm text-success-strong">
          {message}
        </p>
      ) : null}
      <div className="space-y-3 border-t border-border pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-foreground">
            Sesiones activas
          </h3>
          <Button
            variant="secondary"
            onClick={() => void revokeOtherSessions().then(refresh)}
          >
            Cerrar las demás
          </Button>
        </div>
        <ul className="divide-y divide-border rounded-md border border-border">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {session.current
                    ? "Este dispositivo"
                    : (session.userAgent ?? "Dispositivo desconocido")}
                </p>
                <p className="text-xs text-muted">
                  Último uso:{" "}
                  {new Date(session.lastUsedAt).toLocaleString("es")}
                </p>
              </div>
              {!session.current ? (
                <Button
                  variant="secondary"
                  onClick={() => void revokeSession(session.id).then(refresh)}
                >
                  Cerrar sesión
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      {changeOpen ? (
        <Dialog
          title="Cambiar contraseña"
          description="Cerrarás las demás sesiones activas."
          onClose={() => setChangeOpen(false)}
          size="md"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setChangeOpen(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="change-password"
                loading={pending}
                loadingLabel="Actualizando…"
              >
                Actualizar contraseña
              </Button>
            </>
          }
        >
          {changeOpen ? (
            <form
              id="change-password"
              onSubmit={handlePassword}
              className="grid gap-4 md:grid-cols-2"
            >
              <div className="md:col-span-2">
                <FieldLabel htmlFor="current-password">
                  Contraseña actual
                </FieldLabel>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div>
                <FieldLabel htmlFor="new-password">Nueva contraseña</FieldLabel>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={12}
                  required
                />
              </div>
              <div>
                <FieldLabel htmlFor="confirm-password">
                  Confirmar contraseña
                </FieldLabel>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={12}
                  required
                />
              </div>
              {error ? (
                <div className="md:col-span-2">
                  <FieldError>{error}</FieldError>
                </div>
              ) : null}
            </form>
          ) : null}
        </Dialog>
      ) : null}
    </section>
  );
}
