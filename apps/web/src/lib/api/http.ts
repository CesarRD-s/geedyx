export class ApiError extends Error {
  constructor(
    readonly status: number | null,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const API_VERSION_PREFIX = "/api/v1";

export function apiUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new ApiError(
      null,
      "NEXT_PUBLIC_API_URL no está configurada. Revisa apps/web/.env.local y .env.example.",
    );
  }
  return `${API_BASE_URL}${API_VERSION_PREFIX}${path}`;
}

export async function readErrorMessage(response: Response): Promise<string> {
  return (await readErrorResponse(response)).message;
}

export async function readErrorResponse(
  response: Response,
): Promise<{ message: string; code?: string }> {
  try {
    const body: unknown = await response.json();
    if (isErrorBody(body)) {
      return { message: body.message, code: body.code };
    }
  } catch {
    // Malformed error body; fall through to the status-based fallback.
  }
  return { message: `La solicitud falló con el estado ${response.status}.` };
}

function isErrorBody(
  body: unknown,
): body is { message: string; code?: string } {
  return (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string" &&
    (!("code" in body) || typeof body.code === "string")
  );
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === null) {
      return "No se pudo conectar con el servidor.";
    }
    switch (error.status) {
      case 400:
        return "Algunos datos no son válidos. Revisa el formulario.";
      case 401:
        return "Tu sesión no es válida. Inicia sesión nuevamente.";
      case 404:
        return "El recurso no existe o ya fue eliminado.";
      case 409:
        return "La operación no se pudo completar porque hay un conflicto.";
      case 500:
        return "Ha ocurrido un error. Intenta nuevamente.";
    }
  }
  return "Ha ocurrido un error. Intenta nuevamente.";
}
