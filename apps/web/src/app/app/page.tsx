import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminStats, requireSession } from "@/lib/api/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SummaryCard } from "@/components/summary-card";

export const metadata: Metadata = {
  title: "Dashboard · GEEDYX",
};

export default async function AdminDashboardPage() {
  await requireSession();
  const stats = await getAdminStats();
  if (!stats) {
    redirect("/login");
  }

  const { productCounts, categoryCount } = stats;

  return (
    <section className="space-y-6">
      <PageHeader
        title="Inventario"
        description="Resumen de productos y categorías."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Productos" value={productCounts.total} />
        <SummaryCard
          label="Activos"
          value={productCounts.active}
          detail="Disponibles en el catálogo público"
        />
        <SummaryCard
          label="Inactivos"
          value={productCounts.inactive}
          detail="Ocultos del catálogo público"
        />
        <SummaryCard label="Categorías" value={categoryCount} />
      </div>

      {productCounts.total === 0 && (
        <EmptyState
          title="Aún no hay productos"
          description="Cuando se registren productos, aquí aparecerán las cantidades."
        />
      )}
      {categoryCount === 0 && (
        <EmptyState
          title="Aún no hay categorías"
          description="Los productos se organizan por categorías."
        />
      )}
    </section>
  );
}
