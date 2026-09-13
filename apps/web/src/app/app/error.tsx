"use client";

import { ErrorState } from "@/components/ui/error-state";
import { useTranslations } from "@/components/preferences/translation-context";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();
  return (
    <section className="space-y-4">
      <ErrorState
        title={t("error.title")}
        description={t("error.description")}
        onRetry={reset}
      />
    </section>
  );
}
