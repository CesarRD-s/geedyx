export interface AuthUser {
  id: string;
  username: string;
  email: string;
  companyId: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface ProductCategoryRef {
  id: string;
  name: string;
  slug: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: ProductCategoryRef;
}

export interface ProductDetail extends ProductListItem {
  description: string | null;
}

export type ProductSortField = "name" | "price" | "stock" | "createdAt";

export interface ProductListQuery {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  sort: ProductSortField;
  order: "asc" | "desc";
}

export interface ProductInput {
  name: string;
  sku: string;
  description: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  categoryId: string;
  isActive: boolean;
}

export interface ProductListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: ProductListMeta;
}

export interface ProductCounts {
  total: number;
  active: number;
  inactive: number;
}

export interface AdminStats {
  productCounts: ProductCounts;
  categoryCount: number;
}
