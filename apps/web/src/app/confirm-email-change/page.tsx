import { ConfirmEmailChangeForm } from "@/components/confirm-email-change-form";

export default async function ConfirmEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <section className="w-full space-y-6 rounded-md border border-border bg-surface p-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Confirmar correo</h1>
          <p className="mt-1 text-sm text-secondary">Verifica que deseas usar esta dirección para GEEDYX.</p>
        </div>
        <ConfirmEmailChangeForm token={token} />
      </section>
    </main>
  );
}
