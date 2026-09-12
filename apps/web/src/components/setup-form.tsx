"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { setup } from "@/lib/api/client";
import { ApiError } from "@/lib/api/http";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLabel, Input } from "@/components/ui/field";

export function SetupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!username || !email || !password) {
      setError("Completa el nombre de usuario, el correo y la contraseña.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      await setup({ username, email, password });
      router.push("/app");
      router.refresh();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 403) {
        setCompleted(true);
        return;
      }
      setError(toSetupError(cause));
    } finally {
      setPending(false);
    }
  }

  if (completed) {
    return (
      <div className="mt-6 space-y-4">
        <p className="text-sm text-muted">
          Esta instalación de GEEDYX ya está configurada. Inicia sesión para
          continuar.
        </p>
        <Button
          type="button"
          variant="primary"
          size="md"
          className="w-full"
          onClick={() => {
            router.push("/login");
            router.refresh();
          }}
        >
          Ir a iniciar sesión
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
      <div>
        <FieldLabel htmlFor="username">Nombre de usuario</FieldLabel>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          disabled={pending}
          placeholder="admin"
        />
      </div>
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
          autoComplete="new-password"
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
        loadingLabel="Configurando…"
      >
        Crear administrador
      </Button>
    </form>
  );
}

function toSetupError(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 400) {
      return "Algunos datos no son válidos. Revisa los campos.";
    }
    if (cause.status === null) {
      return "No se pudo conectar con el servidor. Inténtalo de nuevo.";
    }
    return "No se pudo completar la configuración. Inténtalo de nuevo.";
  }
  return "Ocurrió un error inesperado.";
}
