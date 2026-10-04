import type {
  ActiveSession,
  AuditResponse,
  AuthSession,
  CsrfToken,
  CategoriesResponse,
  CompanyConfiguration,
  LogoutResult,
  ProductsResponse,
  PasswordChanged,
  RolesResponse,
  SessionsResponse,
  OwnerCreated,
  ProblemDetails,
  SessionManagementDetails,
  SetupStatus,
  UserCreated,
  UserPreferences,
  UserUpdated,
  UsersResponse,
  TemporaryPasswordIssued,
} from '@geedyx/contracts';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const apiOrigin = apiUrl.replace(/\/api\/v1\/?$/, '');

type ApiEnvelope<T> = {
  data: T;
  meta: {
    requestId: string;
  };
};

function logDevelopmentApiWarning(details: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  console.warn('[Geedyx Web] API request failed', details);
}

function isExpectedApiResponse(path: string, status: number): boolean {
  const normalizedPath = path.split('?')[0];

  if (status === 401) {
    return normalizedPath === '/auth/me' || normalizedPath === '/auth/login';
  }

  if (normalizedPath === '/auth/login') {
    return status === 409;
  }

  if (normalizedPath === '/setup/owner') {
    return status === 409 || status === 422;
  }

  if (normalizedPath === '/users') {
    return status === 409 || status === 422;
  }

  if (normalizedPath.startsWith('/users/')) {
    return status === 404 || status === 409 || status === 422;
  }

  if (
    normalizedPath === '/configuration' ||
    normalizedPath === '/products' ||
    normalizedPath === '/products/categories'
  ) {
    return status === 404 || status === 409 || status === 422;
  }

  if (normalizedPath.startsWith('/audit')) {
    return status === 422;
  }

  if (normalizedPath === '/auth/password') {
    return status === 401 || status === 422;
  }

  if (normalizedPath === '/auth/preferences') {
    return status === 400 || status === 422;
  }

  return false;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem?: ProblemDetails,
  ) {
    super(problem?.detail ?? 'No se pudo completar la solicitud.');
    this.name = 'ApiClientError';
  }
}

async function request<T>(
  path: string,
  options?: RequestInit,
  baseUrl = apiUrl,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...options?.headers,
      },
    });
  } catch (error) {
    logDevelopmentApiWarning({
      path,
      reason: 'api_unavailable',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    throw error;
  }

  const rawBody = await response.text();
  const body = rawBody
    ? (JSON.parse(rawBody) as ApiEnvelope<T> | ProblemDetails)
    : undefined;

  if (!response.ok) {
    const problem = body as ProblemDetails | undefined;

    if (!isExpectedApiResponse(path, response.status)) {
      logDevelopmentApiWarning({
        path,
        status: response.status,
        code: problem?.code ?? 'UNKNOWN_API_ERROR',
        requestId: problem?.requestId ?? response.headers.get('x-request-id'),
      });
    }

    throw new ApiClientError(response.status, problem);
  }

  return (body as ApiEnvelope<T>).data;
}

export function getHealthLive(): Promise<{ service: 'api'; status: 'ok' }> {
  return request<{ service: 'api'; status: 'ok' }>(
    '/health/live',
    undefined,
    apiOrigin,
  );
}

export function getHealthReady(): Promise<{
  dependencies: { database: 'up' };
  status: 'ok';
}> {
  return request<{
    dependencies: { database: 'up' };
    status: 'ok';
  }>('/health/ready', undefined, apiOrigin);
}

export function getCsrfToken(): Promise<CsrfToken> {
  return request<CsrfToken>('/auth/csrf');
}

export function getSetupStatus(): Promise<SetupStatus> {
  return request<SetupStatus>('/setup/status');
}

export function createOwner(
  payload: {
    displayName: string;
    email: string;
    password: string;
    passwordConfirmation: string;
  },
  idempotencyKey: string,
): Promise<OwnerCreated> {
  return request<OwnerCreated>('/setup/owner', {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    method: 'POST',
  });
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const csrf = await getCsrfToken();
  return request<AuthSession>('/auth/login', {
    body: JSON.stringify({ email, password }),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf.token,
    },
    method: 'POST',
  });
}

export function getCurrentSession(): Promise<AuthSession> {
  return request<AuthSession>('/auth/me');
}

type PaginationQuery = {
  page?: number;
  pageSize?: number;
};

function paginationSuffix(pagination?: PaginationQuery): string {
  const search = new URLSearchParams();
  if (pagination?.page) search.set('page', String(pagination.page));
  if (pagination?.pageSize) search.set('pageSize', String(pagination.pageSize));
  return search.toString() ? `?${search.toString()}` : '';
}

export function getPreferences(): Promise<UserPreferences> {
  return request<UserPreferences>('/auth/preferences');
}

export async function updatePreferences(payload: {
  language: 'es' | 'en' | null;
  timeZone: string | null;
}): Promise<UserPreferences> {
  const csrf = await getCsrfToken();
  return request<UserPreferences>('/auth/preferences', {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf.token,
    },
    method: 'PATCH',
  });
}

export function getUsers(pagination?: PaginationQuery): Promise<UsersResponse> {
  return request<UsersResponse>(`/users${paginationSuffix(pagination)}`);
}

export function getRoles(): Promise<RolesResponse> {
  return request<RolesResponse>('/users/roles');
}

export async function createUser(payload: {
  displayName: string;
  email: string;
}): Promise<UserCreated> {
  const csrf = await getCsrfToken();
  return request<UserCreated>('/users', {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf.token,
    },
    method: 'POST',
  });
}

export async function updateUserStatus(
  userId: string,
  payload: { status: 'ACTIVE' | 'DISABLED' | 'LOCKED'; reason: string },
): Promise<UserUpdated> {
  const csrf = await getCsrfToken();
  return request<UserUpdated>(`/users/${userId}/status`, {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf.token,
    },
    method: 'PATCH',
  });
}

export async function updateUserRoles(
  userId: string,
  payload: { roleCodes: string[]; reason: string },
): Promise<UserUpdated> {
  const csrf = await getCsrfToken();
  return request<UserUpdated>(`/users/${userId}/roles`, {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf.token,
    },
    method: 'PATCH',
  });
}

export async function issueTemporaryPassword(
  userId: string,
  reason: string,
): Promise<TemporaryPasswordIssued> {
  const csrf = await getCsrfToken();
  return request<TemporaryPasswordIssued>(`/users/${userId}/temporary-password`, {
    body: JSON.stringify({ reason }),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf.token,
    },
    method: 'POST',
  });
}

export function getUserSessions(userId: string): Promise<SessionsResponse> {
  return request<SessionsResponse>(`/users/${userId}/sessions`);
}

export async function revokeUserSession(
  userId: string,
  sessionId: string,
): Promise<{ revoked: true }> {
  const csrf = await getCsrfToken();
  return request<{ revoked: true }>(`/users/${userId}/sessions/${sessionId}/revoke`, {
    body: JSON.stringify({}),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf.token,
    },
    method: 'POST',
  });
}

export function getOwnSessions(): Promise<{ sessions: ActiveSession[] }> {
  return request<{ sessions: ActiveSession[] }>('/auth/sessions');
}

export async function revokeOwnSession(sessionId: string): Promise<{ revoked: true }> {
  const csrf = await getCsrfToken();
  return request<{ revoked: true }>(`/auth/sessions/${sessionId}/revoke`, {
    headers: {
      'X-CSRF-Token': csrf.token,
    },
    method: 'POST',
  });
}

export function getConfiguration(): Promise<CompanyConfiguration> {
  return request<CompanyConfiguration>('/configuration');
}

export async function updateConfiguration(
  payload: Partial<CompanyConfiguration>,
): Promise<CompanyConfiguration> {
  const csrf = await getCsrfToken();
  return request<CompanyConfiguration>('/configuration', {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf.token,
    },
    method: 'PATCH',
  });
}

export function getCategories(
  pagination?: PaginationQuery,
): Promise<CategoriesResponse> {
  return request<CategoriesResponse>(
    `/products/categories${paginationSuffix(pagination)}`,
  );
}

export async function createCategory(payload: {
  name: string;
  parentId?: string;
}): Promise<CategoriesResponse['categories'][number]> {
  const csrf = await getCsrfToken();
  return request<CategoriesResponse['categories'][number]>('/products/categories', {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf.token,
    },
    method: 'POST',
  });
}

export function getProducts(pagination?: PaginationQuery): Promise<ProductsResponse> {
  return request<ProductsResponse>(`/products${paginationSuffix(pagination)}`);
}

export function getAudit(filters?: {
  action?: string;
  module?: string;
  outcome?: 'SUCCESS' | 'FAILURE';
  page?: number;
  pageSize?: number;
  query?: string;
}): Promise<AuditResponse> {
  const search = new URLSearchParams();
  if (filters?.module) search.set('module', filters.module);
  if (filters?.action) search.set('action', filters.action);
  if (filters?.outcome) search.set('outcome', filters.outcome);
  if (filters?.page) search.set('page', String(filters.page));
  if (filters?.pageSize) search.set('pageSize', String(filters.pageSize));
  if (filters?.query) search.set('query', filters.query);
  const suffix = search.toString() ? `?${search.toString()}` : '';
  return request<AuditResponse>(`/audit${suffix}`);
}

export async function createProduct(payload: {
  title: string;
  sku: string;
  priceCents: number;
  categoryId?: string;
}): Promise<ProductsResponse['products'][number]> {
  const csrf = await getCsrfToken();
  return request<ProductsResponse['products'][number]>('/products', {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf.token,
    },
    method: 'POST',
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<PasswordChanged> {
  const csrf = await getCsrfToken();
  return request<PasswordChanged>('/auth/password', {
    body: JSON.stringify({ currentPassword, newPassword }),
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf.token,
    },
    method: 'POST',
  });
}

export function revokeSession(
  sessionId: string,
  sessionManagementToken: string,
): Promise<{ revoked: true }> {
  return getCsrfToken().then((csrf) =>
    request<{ revoked: true }>('/auth/sessions/revoke', {
      body: JSON.stringify({ sessionId, sessionManagementToken }),
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf.token,
      },
      method: 'POST',
    }),
  );
}

export function getSessionManagementDetails(
  error: ApiClientError,
): SessionManagementDetails | null {
  return error.problem?.sessionManagement ?? null;
}

export async function logout(): Promise<LogoutResult> {
  const csrf = await getCsrfToken();
  return request<LogoutResult>('/auth/logout', {
    headers: {
      'X-CSRF-Token': csrf.token,
    },
    method: 'POST',
  });
}
