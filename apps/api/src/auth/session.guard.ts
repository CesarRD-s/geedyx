import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from './auth.types';
import { parseCookies } from './auth.utils';
import { ALLOW_PENDING_PASSWORD_CHANGE } from './allow-pending-password-change.decorator';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const cookieName = this.authService.getSessionCookieName();
    const token = parseCookies(request.headers.cookie)[cookieName];
    const session = await this.authService.resolveSession(token, {
      touchActivity: request.method !== 'GET',
    });

    const allowsPendingPasswordChange = this.reflector.get<boolean>(
      ALLOW_PENDING_PASSWORD_CHANGE,
      context.getHandler(),
    );
    if (session.user.passwordChangeRequired && !allowsPendingPasswordChange) {
      throw new ForbiddenException({
        code: 'PASSWORD_CHANGE_REQUIRED',
        detail: 'Debes cambiar tu contraseña antes de continuar.',
      });
    }

    request.auth = session;
    if (request.method !== 'GET') {
      this.authService.setSessionCookie(response, token as string, session.expiresAt);
    }
    return true;
  }
}
