import type { Metadata } from "next";
import { getCategories, requirePermission } from "@/lib/api/server";
import { CategoriesView } from "@/components/categories/categories-view";

export const metadata: Metadata = {
  title: "Categories · GEEDYX",
};

export default async function AdminCategoriesPage() {
  const user = await requirePermission("catalog.read");
  const categories = await getCategories();
  return (
    <CategoriesView
      initialCategories={categories}
      canManage={user.permissions.includes("catalog.manage")}
    />
  );
}
