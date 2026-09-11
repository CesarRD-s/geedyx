import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-border-strong bg-surface p-8">
      {icon ? (
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-surface-subtle text-muted">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}