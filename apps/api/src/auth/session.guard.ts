import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from './auth.types';
import { parseCookies } from './auth.utils';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const cookieName = this.authService.getSessionCookieName();
    const token = parseCookies(request.headers.cookie)[cookieName];
    const session = await this.authService.resolveSession(token, {
      touchActivity: request.method !== 'GET',
    });

    request.auth = session;
    if (request.method !== 'GET') {
      this.authService.setSessionCookie(response, token as string, session.expiresAt);
    }
    return true;
  }
}
