export type PermissionCode =
  | "catalog.read"
  | "catalog.manage"
  | "users.read"
  | "users.manage"
  | "company.manage";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  companyId: string;
  displayName: string | null;
  locale: string;
  timeZone: string;
  permissions: PermissionCode[];
}

export interface SessionSummary {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
}

export interface CompanySettings {
  name: string | null;
  locale: "es" | "en" | null;
  timeZone: string | null;
  currency: "HNL" | "USD" | "MXN" | "COP" | "EUR" | null;
  configuredAt: string | null;
}

export interface CompanySettingsInput {
  name?: string;
  locale?: "es" | "en";
  timeZone?: string;
  currency?: "HNL" | "USD" | "MXN" | "COP" | "EUR";
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

export interface RoleSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export interface InternalUser {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  locale: string;
  timeZone: string;
  status: "ACTIVE" | "SUSPENDED";
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: Array<{
    id: string;
    code: string;
    name: string;
    isSystem: boolean;
  }>;
}

export interface UserListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: "ACTIVE" | "SUSPENDED";
}

export interface UserInput {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  roleIds: string[];
}

export interface UserUpdateInput {
  displayName?: string;
  locale?: string;
  timeZone?: string;
  status?: "ACTIVE" | "SUSPENDED";
  roleIds?: string[];
}
