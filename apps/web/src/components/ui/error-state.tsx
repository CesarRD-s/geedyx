"use client";

import { Button } from "./button";

/**
 * Shared retryable error block for route error boundaries. Rendered inside a
 * `role="alert"`; pages wrap it in their own layout/shell as needed.
 */
export function ErrorState({
  title,
  description,
  onRetry,
  titleLevel = "h2",
}: {
  title: string;
  description: string;
  onRetry: () => void;
  titleLevel?: "h1" | "h2";
}) {
  const TitleTag = titleLevel === "h1" ? "h1" : "h2";
  return (
    <section className="space-y-4" role="alert">
      <div>
        <TitleTag className="text-xl font-semibold text-foreground">
          {title}
        </TitleTag>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <Button variant="primary" size="md" onClick={onRetry}>
        Reintentar
      </Button>
    </section>
  );
}