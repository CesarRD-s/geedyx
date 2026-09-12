import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getInstallationStatus, getSession } from "@/lib/api/server";
import { SetupForm } from "@/components/setup-form";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata: Metadata = {
  title: "Configurar administrador · GEEDYX",
};

export default async function SetupPage() {
  const [user, installation] = await Promise.all([
    getSession(),
    getInstallationStatus(),
  ]);
  if (user) {
    redirect("/app");
  }
  if (installation.installed) {
    redirect("/login");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <BrandLogo priority className="justify-center" />
          <p className="mt-1 text-sm text-muted">
            Administración de productos e inventario
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6 shadow-panel">
          <h1 className="text-lg font-medium text-foreground">
            Configuración inicial
          </h1>
          <p className="mt-1 text-sm text-muted">
            Crea la empresa y el administrador principal de esta instalación.
          </p>
          <SetupForm />
        </div>
      </div>
    </main>
  );
}
