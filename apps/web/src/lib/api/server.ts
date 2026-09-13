import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { cache } from "react";
import { ApiError, apiUrl, readErrorMessage } from "./http";
import { productQueryToSearchParams } from "@/lib/products/query";
import type {
  AdminStats,
  AuthUser,
  CategorySummary,
  Paginated,
  ProductListItem,
  ProductListQuery,
  ProductCounts,
  PermissionCode,
  InternalUser,
  RoleSummary,
  UserListQuery,
} from "./types";

export const SESSION_COOKIE_NAME = "geedyx_session";

export async function sessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value;
}

async function authenticatedFetch<T>(path: string): Promise<T> {
  const token = await sessionToken();
  const response = await fetch(apiUrl(path), {
    headers: token ? { cookie: `${SESSION_COOKIE_NAME}=${token}` } : undefined,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }
  return (await response.json()) as T;
}

export const getSession = cache(async (): Promise<AuthUser | null> => {
  try {
    return await authenticatedFetch<AuthUser>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
});

export async function getInstallationStatus(): Promise<{ installed: boolean }> {
  const response = await fetch(apiUrl("/auth/installation"), {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }
  return (await response.json()) as { installed: boolean };
}

export async function requireSession(): Promise<AuthUser> {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function getCategories(): Promise<CategorySummary[]> {
  return authenticatedFetch<CategorySummary[]>("/categories");
}

export async function getProducts(
  query: ProductListQuery,
): Promise<Paginated<ProductListItem>> {
  const params = productQueryToSearchParams(query);
  return authenticatedFetch<Paginated<ProductListItem>>(
    `/products?${params.toString()}`,
  );
}

export async function getAdminStats(): Promise<AdminStats | null> {
  try {
    const [totalPage, activePage, categories] = await Promise.all([
      authenticatedFetch<Paginated<unknown>>("/products?page=1&limit=1"),
      authenticatedFetch<Paginated<unknown>>(
        "/products?page=1&limit=1&isActive=true",
      ),
      authenticatedFetch<CategorySummary[]>("/categories"),
    ]);

    const total = totalPage.meta.total;
    const active = activePage.meta.total;
    const productCounts: ProductCounts = {
      total,
      active,
      inactive: Math.max(0, total - active),
    };

    return { productCounts, categoryCount: categories.length };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function requirePermission(
  permission: PermissionCode,
): Promise<AuthUser> {
  const user = await requireSession();
  if (!user.permissions.includes(permission)) {
    redirect("/app");
  }
  return user;
}

export async function getUsers(
  query: UserListQuery,
): Promise<Paginated<InternalUser>> {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
  });
  if (query.search) {
    params.set("search", query.search);
  }
  if (query.status) {
    params.set("status", query.status);
  }
  return authenticatedFetch<Paginated<InternalUser>>(
    `/users?${params.toString()}`,
  );
}

export async function getAssignableRoles(): Promise<RoleSummary[]> {
  return authenticatedFetch<RoleSummary[]>("/users/roles");
}
