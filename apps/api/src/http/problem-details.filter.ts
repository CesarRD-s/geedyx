import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { RequestWithId } from './request-id.middleware';
import type { SessionManagementDetails } from '@geedyx/contracts';

type ExceptionPayload = {
  code?: string;
  detail?: string;
  errors?: Array<{ field?: string; code: string; message: string }>;
  message?: string | string[];
  sessionManagement?: SessionManagementDetails;
};

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<RequestWithId & Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const payload: ExceptionPayload =
      typeof raw === 'object' && raw !== null ? raw : {};
    const requestId = request.requestId ?? 'unknown';
    const code = payload.code ?? this.defaultCode(status);
    const detail = this.safeDetail(status, payload.detail ?? payload.message);

    response
      .status(status)
      .type('application/problem+json')
      .json({
        type: `https://api.geedyx.com/problems/${code.toLowerCase().replaceAll('_', '-')}`,
        title: this.title(status),
        status,
        detail,
        instance: request.originalUrl ?? request.url,
        code,
        requestId,
        ...(payload.errors ? { errors: payload.errors } : {}),
        ...(payload.sessionManagement
          ? { sessionManagement: payload.sessionManagement }
          : {}),
      });
  }

  private defaultCode(status: number): string {
    if (status === 400) return 'BAD_REQUEST';
    if (status === 401) return 'UNAUTHENTICATED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 409) return 'CONFLICT';
    if (status === 422) return 'VALIDATION_ERROR';
    if (status === 429) return 'RATE_LIMITED';
    if (status === 503) return 'SERVICE_UNAVAILABLE';
    return 'INTERNAL_ERROR';
  }

  private title(status: number): string {
    if (status >= 500) return 'No se pudo completar la solicitud';
    if (status === 401) return 'Autenticación requerida';
    if (status === 403) return 'Acceso denegado';
    if (status === 404) return 'Recurso no encontrado';
    if (status === 409) return 'La operación entra en conflicto con el estado actual';
    if (status === 422) return 'Los datos no son válidos';
    return 'La solicitud no es válida';
  }

  private safeDetail(status: number, value: string | string[] | undefined): string {
    if (status >= 500)
      return 'Ocurrió un error inesperado. Usa el requestId para soporte.';
    if (Array.isArray(value)) return value.join('; ');
    return value ?? this.title(status);
  }
}
