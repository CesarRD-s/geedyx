import { AcceptInvitationForm } from "@/components/accept-invitation-form";

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <section className="w-full space-y-6 rounded-md border border-border bg-surface p-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Completa tu acceso</h1>
          <p className="mt-1 text-sm text-secondary">Crea una contraseña para activar tu cuenta de GEEDYX.</p>
        </div>
        <AcceptInvitationForm token={token} />
      </section>
    </main>
  );
}
