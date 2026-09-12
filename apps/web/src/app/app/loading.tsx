export default function AdminLoading() {
  return (
    <section className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-6 w-40 animate-pulse rounded bg-surface-subtle" />
          <div className="h-4 w-72 animate-pulse rounded bg-surface-subtle" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-md border border-border bg-surface p-4"
          >
            <div className="mb-2 h-4 w-24 animate-pulse rounded bg-surface-subtle" />
            <div className="h-7 w-16 animate-pulse rounded bg-surface-subtle" />
          </div>
        ))}
      </div>
    </section>
  );
}
