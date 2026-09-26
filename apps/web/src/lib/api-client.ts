import type {
  AuthSession,
  CsrfToken,
  LogoutResult,
  OwnerCreated,
  ProblemDetails,
  SetupStatus,
} from '@geedyx/contracts';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const apiOrigin = apiUrl.replace(/\/api\/v1\/?$/, '');

type ApiEnvelope<T> = {
  data: T;
  meta: {
    requestId: string;
  };
};

function logDevelopmentApiError(details: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  console.error('[Geedyx Web] API request failed', details);
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
    logDevelopmentApiError({
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

    logDevelopmentApiError({
      path,
      status: response.status,
      code: problem?.code ?? 'UNKNOWN_API_ERROR',
      requestId: problem?.requestId ?? response.headers.get('x-request-id'),
    });

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

export async function logout(): Promise<LogoutResult> {
  const csrf = await getCsrfToken();
  return request<LogoutResult>('/auth/logout', {
    headers: {
      'X-CSRF-Token': csrf.token,
    },
    method: 'POST',
  });
}
