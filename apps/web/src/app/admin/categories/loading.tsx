export default function CategoriesLoading() {
  return (
    <section className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-6 w-40 animate-pulse rounded bg-surface-subtle" />
          <div className="h-4 w-72 animate-pulse rounded bg-surface-subtle" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-md bg-surface-subtle" />
      </div>
      <div className="h-9 w-full max-w-sm animate-pulse rounded-md bg-surface-subtle" />
      <div className="hidden overflow-x-auto rounded-md border border-border bg-surface sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5 font-medium">
                <div className="h-3 w-24 animate-pulse rounded bg-surface-subtle" />
              </th>
              <th className="px-4 py-2.5 font-medium">
                <div className="h-3 w-16 animate-pulse rounded bg-surface-subtle" />
              </th>
              <th className="px-4 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index}>
                <td className="px-4 py-3">
                  <div className="h-4 w-40 animate-pulse rounded bg-surface-subtle" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-3 w-24 animate-pulse rounded bg-surface-subtle" />
                </td>
                <td className="px-4 py-3">
                  <div className="ml-auto h-8 w-28 animate-pulse rounded bg-surface-subtle" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
