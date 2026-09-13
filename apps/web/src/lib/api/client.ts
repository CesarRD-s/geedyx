import { ApiError, apiUrl, readErrorMessage } from "./http";
import type {
  AuthUser,
  CategorySummary,
  ProductDetail,
  ProductInput,
  InternalUser,
  Paginated,
  RoleSummary,
  UserInput,
  UserListQuery,
  UserUpdateInput,
  SessionSummary,
  CompanySettings,
  CompanySettingsInput,
} from "./types";

async function clientFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = apiUrl(path);
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (init.method && !["GET", "HEAD", "OPTIONS"].includes(init.method)) {
    const csrfToken = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith("geedyx_csrf="))
      ?.split("=")[1];
    if (csrfToken) {
      headers.set("X-CSRF-Token", decodeURIComponent(csrfToken));
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError(null, "No se pudo conectar con el servidor.");
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function setup(input: {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthUser> {
  return clientFetch<AuthUser>("/auth/setup", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  return clientFetch<AuthUser>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function logout(): Promise<void> {
  await clientFetch<void>("/auth/logout", { method: "POST" });
}

export async function listCategories(): Promise<CategorySummary[]> {
  return clientFetch<CategorySummary[]>("/categories");
}

export async function createCategory(input: {
  name: string;
}): Promise<CategorySummary> {
  return clientFetch<CategorySummary>("/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCategory(
  id: string,
  input: { name: string },
): Promise<CategorySummary> {
  return clientFetch<CategorySummary>(`/categories/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await clientFetch<void>(`/categories/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function getProduct(id: string): Promise<ProductDetail> {
  return clientFetch<ProductDetail>(`/products/${encodeURIComponent(id)}`);
}

export async function createProduct(
  input: ProductInput,
): Promise<ProductDetail> {
  return clientFetch<ProductDetail>("/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
): Promise<ProductDetail> {
  return clientFetch<ProductDetail>(`/products/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await clientFetch<void>(`/products/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function uploadProductImage(
  id: string,
  file: File,
): Promise<ProductDetail> {
  const body = new FormData();
  body.append("file", file);
  return clientFetch<ProductDetail>(
    `/products/${encodeURIComponent(id)}/image`,
    {
      method: "POST",
      body,
    },
  );
}

export async function deleteProductImage(id: string): Promise<void> {
  await clientFetch<void>(`/products/${encodeURIComponent(id)}/image`, {
    method: "DELETE",
  });
}

export async function getCurrentUser(): Promise<AuthUser> {
  return clientFetch<AuthUser>("/auth/me");
}

export async function updateProfile(input: {
  displayName?: string;
  locale?: "es" | "en";
  timeZone?: string;
}): Promise<AuthUser> {
  return clientFetch<AuthUser>("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function listSessions(): Promise<SessionSummary[]> {
  return clientFetch<SessionSummary[]>("/auth/sessions");
}

export async function revokeSession(id: string): Promise<void> {
  await clientFetch<void>(`/auth/sessions/${encodeURIComponent(id)}/revoke`, {
    method: "POST",
  });
}

export async function revokeOtherSessions(): Promise<void> {
  await clientFetch<void>("/auth/sessions/revoke-others", { method: "POST" });
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await clientFetch<void>("/auth/password/change", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getCompanySettings(): Promise<CompanySettings> {
  return clientFetch<CompanySettings>("/company/settings");
}

export async function updateCompanySettings(
  input: CompanySettingsInput,
): Promise<CompanySettings> {
  return clientFetch<CompanySettings>("/company/settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function listUsers(
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
  return clientFetch<Paginated<InternalUser>>(`/users?${params.toString()}`);
}

export async function listAssignableRoles(): Promise<RoleSummary[]> {
  return clientFetch<RoleSummary[]>("/users/roles");
}

export async function createUser(input: UserInput): Promise<InternalUser> {
  return clientFetch<InternalUser>("/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateUser(
  id: string,
  input: UserUpdateInput,
): Promise<InternalUser> {
  return clientFetch<InternalUser>(`/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
