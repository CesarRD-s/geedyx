import type { ProductListQuery } from "@/lib/api/types";

export const PRODUCT_LIMITS = [10, 20, 50] as const;
export const DEFAULT_LIMIT = 20;

const SORT_FIELDS = new Set(["name", "price", "stock", "createdAt"]);
const ORDERS = new Set(["asc", "desc"]);

function firstValue(
  input: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = input[key];
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseProductQuery(
  input: Record<string, string | string[] | undefined>,
): ProductListQuery {
  const page = parsePositiveInt(firstValue(input, "page")) ?? 1;

  const rawLimit = parsePositiveInt(firstValue(input, "limit")) ?? DEFAULT_LIMIT;
  const limit =
    (PRODUCT_LIMITS as readonly number[]).includes(rawLimit)
      ? rawLimit
      : DEFAULT_LIMIT;

  const rawSort = firstValue(input, "sort");
  const sort =
    rawSort !== undefined && SORT_FIELDS.has(rawSort)
      ? (rawSort as ProductListQuery["sort"])
      : "createdAt";

  const rawOrder = firstValue(input, "order");
  const order =
    rawOrder !== undefined && ORDERS.has(rawOrder)
      ? (rawOrder as "asc" | "desc")
      : "desc";

  const search = firstValue(input, "search")?.trim().slice(0, 120) || undefined;
  const categoryId = firstValue(input, "categoryId")?.trim() || undefined;

  const rawIsActive = firstValue(input, "isActive");
  const isActive =
    rawIsActive === "true"
      ? true
      : rawIsActive === "false"
        ? false
        : undefined;

  return { page, limit, search, categoryId, isActive, sort, order };
}

export function productQueryToSearchParams(
  query: ProductListQuery,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  params.set("sort", query.sort);
  params.set("order", query.order);
  if (query.search) {
    params.set("search", query.search);
  }
  if (query.categoryId) {
    params.set("categoryId", query.categoryId);
  }
  if (query.isActive !== undefined) {
    params.set("isActive", String(query.isActive));
  }
  return params;
}