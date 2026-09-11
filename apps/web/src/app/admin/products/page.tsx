import type { Metadata } from "next";
import { getCategories, getProducts, requireSession } from "@/lib/api/server";
import { parseProductQuery } from "@/lib/products/query";
import { ProductsView } from "@/components/products/products-view";

export const metadata: Metadata = {
  title: "Products · GEEDYX",
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession();
  const entered = await searchParams;
  const query = parseProductQuery(entered);
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts(query),
  ]);
  return (
    <ProductsView
      initialPage={products}
      categories={categories}
      initialQuery={query}
    />
  );
}