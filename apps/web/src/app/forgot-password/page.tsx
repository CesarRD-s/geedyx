import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getInstallationStatus } from "@/lib/api/server";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata: Metadata = { title: "Recuperar contraseña · GEEDYX" };

export default async function ForgotPasswordPage() {
  if (!(await getInstallationStatus()).installed) redirect("/setup");
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center"><BrandLogo priority size="lg" className="justify-center" /></div>
        <div className="rounded-lg border border-border bg-surface p-6 shadow-panel">
          <h1 className="text-lg font-medium text-foreground">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-muted">Solicita un enlace de un solo uso para tu cuenta.</p>
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
