import { ApiError, apiUrl, readErrorMessage } from "./http";
import type {
  AuthUser,
  CategorySummary,
  ProductDetail,
  ProductInput,
} from "./types";

async function clientFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = apiUrl(path);
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
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
  companyName: string;
  username: string;
  email: string;
  password: string;
  installationSecret: string;
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
  return clientFetch<ProductDetail>(`/products/${encodeURIComponent(id)}/image`, {
    method: "POST",
    body,
  });
}

export async function deleteProductImage(id: string): Promise<void> {
  await clientFetch<void>(`/products/${encodeURIComponent(id)}/image`, {
    method: "DELETE",
  });
}
