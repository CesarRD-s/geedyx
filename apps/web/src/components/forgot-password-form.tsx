"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLabel, Input } from "@/components/ui/field";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!email) {
      setError("Ingresa tu correo electrónico.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setComplete(true);
    } catch {
      setError("No se pudo procesar la solicitud. Inténtalo nuevamente.");
    } finally {
      setPending(false);
    }
  }

  if (complete) {
    return (
      <div className="mt-6 space-y-4">
        <p role="status" className="text-sm text-secondary">
          Si existe una cuenta activa con ese correo, recibirás un enlace para
          restablecer la contraseña.
        </p>
        <Link href="/login" className="text-sm font-medium text-accent hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-6 space-y-4">
      <div>
        <FieldLabel htmlFor="recovery-email">Correo electrónico</FieldLabel>
        <Input
          id="recovery-email"
          name="email"
          type="email"
          autoComplete="email"
          disabled={pending}
          required
        />
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
      <Button
        type="submit"
        className="w-full"
        loading={pending}
        loadingLabel="Enviando solicitud..."
      >
        Enviar enlace
      </Button>
      <Link href="/login" className="block text-center text-sm font-medium text-accent hover:underline">
        Volver a iniciar sesión
      </Link>
    </form>
  );
}
