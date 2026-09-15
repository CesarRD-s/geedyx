"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { acceptInvitation } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLabel, Input } from "@/components/ui/field";

export function AcceptInvitationForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    if (password.length < 12) {
      setError("La contraseña debe tener al menos 12 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await acceptInvitation({ token, password, confirmPassword });
      setComplete(true);
    } catch {
      setError("La invitación no es válida, expiró o ya fue utilizada.");
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return <FieldError>La invitación no contiene un token.</FieldError>;
  }
  if (complete) {
    return (
      <div className="space-y-4">
        <p role="status" className="text-sm text-success-strong">
          Tu acceso está listo. Ya puedes iniciar sesión.
        </p>
        <Link href="/login" className="text-sm font-medium text-accent hover:underline">
          Ir al inicio de sesión
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <FieldLabel htmlFor="invitation-password">Crea tu contraseña</FieldLabel>
        <Input id="invitation-password" name="password" type="password" autoComplete="new-password" disabled={pending} required />
      </div>
      <div>
        <FieldLabel htmlFor="invitation-password-confirm">Confirma tu contraseña</FieldLabel>
        <Input id="invitation-password-confirm" name="confirmPassword" type="password" autoComplete="new-password" disabled={pending} required />
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
      <Button type="submit" className="w-full" loading={pending} loadingLabel="Guardando…">
        Activar acceso
      </Button>
    </form>
  );
}
