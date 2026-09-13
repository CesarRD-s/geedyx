import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminStats, requireSession } from "@/lib/api/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SummaryCard } from "@/components/summary-card";
import { getTranslations } from "@/lib/i18n/catalogs";

export const metadata: Metadata = {
  title: "Dashboard · GEEDYX",
};

export default async function AdminDashboardPage() {
  const user = await requireSession();
  const t = getTranslations(user.regionalContext.locale);
  const stats = await getAdminStats();
  if (!stats) {
    redirect("/login");
  }

  const { productCounts, categoryCount } = stats;

  return (
    <section className="space-y-6">
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label={t("dashboard.products")}
          value={productCounts.total}
        />
        <SummaryCard
          label={t("dashboard.active")}
          value={productCounts.active}
          detail={t("dashboard.activeDetail")}
        />
        <SummaryCard
          label={t("dashboard.inactive")}
          value={productCounts.inactive}
          detail={t("dashboard.inactiveDetail")}
        />
        <SummaryCard label={t("dashboard.categories")} value={categoryCount} />
      </div>

      {productCounts.total === 0 && (
        <EmptyState
          title={t("dashboard.noProducts")}
          description={t("dashboard.noProductsDescription")}
        />
      )}
      {categoryCount === 0 && (
        <EmptyState
          title={t("dashboard.noCategories")}
          description={t("dashboard.noCategoriesDescription")}
        />
      )}
    </section>
  );
}
