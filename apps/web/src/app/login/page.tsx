import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/api/server";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata: Metadata = {
  title: "Iniciar sesión · GEEDYX",
};

export default async function LoginPage() {
  const user = await getSession();
  if (user) {
    redirect("/admin");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            GEEDYX
          </p>
          <p className="mt-1 text-sm text-muted">
            Administración de productos e inventario
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6 shadow-panel">
          <h1 className="text-lg font-medium text-foreground">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-muted">
            Ingresa con tu cuenta de administrador.
          </p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}