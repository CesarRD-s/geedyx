"use client";

import Link from "next/link";
import { useState } from "react";
import { confirmEmailChange } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

export function ConfirmEmailChangeForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      await confirmEmailChange(token);
      setComplete(true);
    } catch {
      setError("El enlace no es válido, expiró o ya fue utilizado.");
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return <FieldError>El enlace no contiene un token.</FieldError>;
  }
  if (complete) {
    return (
      <div className="space-y-4">
        <p role="status" className="text-sm text-success-strong">
          Tu correo fue actualizado. Inicia sesión nuevamente.
        </p>
        <Link href="/login" className="text-sm font-medium text-accent hover:underline">
          Ir al inicio de sesión
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-secondary">
        Confirmar este cambio cerrará todas las sesiones activas.
      </p>
      {error ? <FieldError>{error}</FieldError> : null}
      <Button type="button" className="w-full" onClick={() => void confirm()} loading={pending} loadingLabel="Confirmando…">
        Confirmar nuevo correo
      </Button>
    </div>
  );
}
