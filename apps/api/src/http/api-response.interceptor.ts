import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import type { Response } from 'express';
import type { RequestWithId } from './request-id.middleware';

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    const response = context.switchToHttp().getResponse<Response>();
    const requestId =
      request.requestId ?? response.getHeader('x-request-id')?.toString() ?? 'unknown';

    return next.handle().pipe(
      map((data: unknown) => {
        if (response.statusCode === 204 || data === undefined) return data;
        return { data, meta: { requestId } };
      }),
    );
  }
}
