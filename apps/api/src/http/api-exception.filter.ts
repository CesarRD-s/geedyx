import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import type { RequestWithId } from './request-context.middleware.js';

const ERROR_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
};

interface HttpExceptionBody {
  code?: string;
  message?: string | string[];
}

function exceptionCode(exception: HttpException): string | undefined {
  const body: unknown = exception.getResponse();
  return typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    typeof body.code === 'string'
    ? body.code
    : undefined;
}

function exceptionMessages(exception: HttpException): string[] {
  const body: unknown = exception.getResponse();
  if (typeof body === 'string') {
    return [body];
  }
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message = (body as HttpExceptionBody).message;
    if (typeof message === 'string') {
      return [message];
    }
    if (
      Array.isArray(message) &&
      message.every((item) => typeof item === 'string')
    ) {
      return message;
    }
  }
  return [exception.message];
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<Response>();
    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const details = isHttpException ? exceptionMessages(exception) : undefined;
    const explicitCode = isHttpException
      ? exceptionCode(exception)
      : undefined;

    if (!isHttpException) {
      const trace =
        exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(
        `Unhandled error requestId=${request.requestId}`,
        trace,
      );
    }

    response.status(statusCode).json({
      statusCode,
      code: explicitCode ?? ERROR_CODES[statusCode] ?? 'HTTP_ERROR',
      message:
        statusCode === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Ocurrió un error interno.'
          : (details?.[0] ?? 'La solicitud no pudo completarse.'),
      ...(details && details.length > 1 ? { details } : {}),
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
      path: request.path,
    });
  }
}
