export default function AdminProductsLoading() {
  return (
    <section className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-6 w-32 animate-pulse rounded bg-surface-subtle" />
          <div className="h-4 w-80 animate-pulse rounded bg-surface-subtle" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-md bg-surface-subtle" />
      </div>
      <div className="rounded-md border border-border bg-surface p-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <div className="mb-1 h-4 w-24 animate-pulse rounded bg-surface-subtle" />
              <div className="h-9 animate-pulse rounded-md bg-surface-subtle" />
            </div>
          ))}
        </div>
        <div className="mt-3 h-4 w-56 animate-pulse rounded bg-surface-subtle" />
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-surface">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-border px-4 py-3"
          >
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-md bg-surface-subtle" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-surface-subtle" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-surface-subtle" />
            </div>
            <div className="h-8 w-64 animate-pulse rounded bg-surface-subtle" />
          </div>
        ))}
      </div>
    </section>
  );
}
