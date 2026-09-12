import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9._:-]{1,64}$/;

export interface RequestWithId extends Request {
  requestId: string;
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const suppliedRequestId = request.header('x-request-id');
    const requestId =
      suppliedRequestId && REQUEST_ID_PATTERN.test(suppliedRequestId)
        ? suppliedRequestId
        : randomUUID();
    const startedAt = performance.now();

    (request as RequestWithId).requestId = requestId;
    response.setHeader('X-Request-ID', requestId);
    response.on('finish', () => {
      const durationMs = Math.round(performance.now() - startedAt);
      this.logger.log(
        JSON.stringify({
          requestId,
          method: request.method,
          path: request.path,
          statusCode: response.statusCode,
          durationMs,
        }),
      );
    });

    next();
  }
}
