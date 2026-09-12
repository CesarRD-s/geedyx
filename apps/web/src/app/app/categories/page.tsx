import type { Metadata } from "next";
import { getCategories, requireSession } from "@/lib/api/server";
import { CategoriesView } from "@/components/categories/categories-view";

export const metadata: Metadata = {
  title: "Categories · GEEDYX",
};

export default async function AdminCategoriesPage() {
  await requireSession();
  const categories = await getCategories();
  return <CategoriesView initialCategories={categories} />;
}