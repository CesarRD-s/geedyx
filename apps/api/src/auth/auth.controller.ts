import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { CsrfToken, LogoutResult } from '@geedyx/contracts';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from './auth.types';
import type { RequestWithId } from '../http/request-id.middleware';
import { LoginDto } from './dto/login.dto';
import { parseCookies, tokensMatch } from './auth.utils';
import { SessionGuard } from './session.guard';

const CSRF_HEADER = 'x-csrf-token';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('csrf')
  getCsrf(@Res({ passthrough: true }) response: Response): CsrfToken {
    const token = this.authService.createCsrfToken();
    this.authService.setCsrfCookie(response, token);
    return { token };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Headers(CSRF_HEADER) csrfHeader: string | undefined,
    @Req() request: RequestWithId & Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.assertCsrf(request, csrfHeader);
    const result = await this.authService.login(
      dto,
      request.requestId,
      request.ip,
      request.get('user-agent'),
    );
    this.authService.setSessionCookie(response, result.token, result.session.expiresAt);
    return result.session;
  }

  @Get('me')
  @UseGuards(SessionGuard)
  getCurrentSession(@Req() request: AuthenticatedRequest) {
    return request.auth;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  async logout(
    @Headers(CSRF_HEADER) csrfHeader: string | undefined,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LogoutResult> {
    this.assertCsrf(request, csrfHeader);
    const token = parseCookies(request.headers.cookie)[
      this.authService.getSessionCookieName()
    ];
    const result = await this.authService.logout(token, request.requestId);
    this.authService.clearSessionCookie(response);
    return result;
  }

  private assertCsrf(request: Request, headerToken: string | undefined): void {
    const cookieToken = parseCookies(request.headers.cookie)[
      this.authService.getCsrfCookieName()
    ];
    if (!tokensMatch(cookieToken, headerToken)) {
      throw new ForbiddenException({
        code: 'CSRF_INVALID',
        detail: 'La solicitud no tiene una validación CSRF válida.',
      });
    }
  }
}
