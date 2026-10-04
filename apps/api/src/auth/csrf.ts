import { ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { parseCookies, tokensMatch } from './auth.utils';

export const CSRF_HEADER = 'x-csrf-token';

export function assertCsrf(
  request: Request,
  headerToken: string | undefined,
  cookieName: string,
): void {
  const cookieToken = parseCookies(request.headers.cookie)[cookieName];
  if (!tokensMatch(cookieToken, headerToken)) {
    throw new ForbiddenException({
      code: 'CSRF_INVALID',
      detail: 'La solicitud no tiene una validación CSRF válida.',
    });
  }
}
