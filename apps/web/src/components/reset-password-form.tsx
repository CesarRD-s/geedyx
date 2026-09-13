"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLabel, Input } from "@/components/ui/field";

export function ResetPasswordForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    if (newPassword.length < 12) {
      setError("La contraseña debe tener al menos 12 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await resetPassword({ token, newPassword, confirmPassword });
      setComplete(true);
    } catch {
      setError("El enlace no es válido, expiró o ya fue utilizado.");
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <div className="mt-6 space-y-4">
        <FieldError>El enlace de recuperación no contiene un token.</FieldError>
        <Link href="/forgot-password" className="text-sm font-medium text-accent hover:underline">
          Solicitar otro enlace
        </Link>
      </div>
    );
  }

  if (complete) {
    return (
      <div className="mt-6 space-y-4">
        <p role="status" className="text-sm text-success-strong">
          Contraseña actualizada. Todas las sesiones anteriores fueron cerradas.
        </p>
        <Link href="/login" className="text-sm font-medium text-accent hover:underline">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-6 space-y-4">
      <div>
        <FieldLabel htmlFor="reset-password">Nueva contraseña</FieldLabel>
        <Input id="reset-password" name="newPassword" type="password" autoComplete="new-password" disabled={pending} required />
      </div>
      <div>
        <FieldLabel htmlFor="reset-password-confirmation">Confirmar contraseña</FieldLabel>
        <Input id="reset-password-confirmation" name="confirmPassword" type="password" autoComplete="new-password" disabled={pending} required />
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
      <Button type="submit" className="w-full" loading={pending} loadingLabel="Actualizando...">
        Actualizar contraseña
      </Button>
    </form>
  );
}
