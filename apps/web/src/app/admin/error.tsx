"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="space-y-4">
      <ErrorState
        title="No se pudo cargar la página"
        description="Ocurrió un error inesperado. Intenta cargar la página nuevamente."
        onRetry={reset}
      />
    </section>
  );
}
