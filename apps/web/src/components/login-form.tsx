"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api/client";
import { ApiError } from "@/lib/api/http";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLabel, Input } from "@/components/ui/field";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setError("Completa el correo y la contraseña.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      await login({ email, password });
      router.push("/admin");
      router.refresh();
    } catch (cause) {
      setError(toLoginError(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
      <div>
        <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          placeholder="admin@example.com"
        />
      </div>
      <div>
        <FieldLabel htmlFor="password">Contraseña</FieldLabel>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          placeholder="••••••••"
        />
      </div>

      {error && <FieldError>{error}</FieldError>}

      <Button
        type="submit"
        variant="primary"
        size="md"
        className="w-full"
        loading={pending}
        loadingLabel="Iniciando sesión…"
      >
        Iniciar sesión
      </Button>
    </form>
  );
}

function toLoginError(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 401) {
      return "Credenciales inválidas.";
    }
    if (cause.status === 400) {
      return "Completa el correo y la contraseña.";
    }
    if (cause.status === null) {
      return "No se pudo conectar con el servidor. Inténtalo de nuevo.";
    }
    return "No se pudo iniciar sesión. Inténtalo de nuevo.";
  }
  return "Ocurrió un error inesperado.";
}