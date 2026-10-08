import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { parseCookies } from './auth.utils';
import { SessionGuard } from './session.guard';
import { RevokeSessionDto } from './dto/revoke-session.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { assertCsrf, CSRF_HEADER } from './csrf';
import { AllowPendingPasswordChange } from './allow-pending-password-change.decorator';

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
    assertCsrf(request, csrfHeader, this.authService.getCsrfCookieName());
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
  @AllowPendingPasswordChange()
  getCurrentSession(@Req() request: AuthenticatedRequest) {
    return request.auth;
  }

  @Get('preferences')
  @UseGuards(SessionGuard)
  getPreferences(@Req() request: AuthenticatedRequest) {
    return this.authService.getPreferences(request.auth!.user.id);
  }

  @Patch('preferences')
  @UseGuards(SessionGuard)
  updatePreferences(
    @Body() dto: UpdatePreferencesDto,
    @Headers(CSRF_HEADER) csrfHeader: string | undefined,
    @Req() request: AuthenticatedRequest & RequestWithId & Request,
  ) {
    assertCsrf(request, csrfHeader, this.authService.getCsrfCookieName());
    return this.authService.updatePreferences(
      request.auth!.user.id,
      dto,
      request.requestId,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  @AllowPendingPasswordChange()
  async logout(
    @Headers(CSRF_HEADER) csrfHeader: string | undefined,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LogoutResult> {
    assertCsrf(request, csrfHeader, this.authService.getCsrfCookieName());
    const token = parseCookies(request.headers.cookie)[
      this.authService.getSessionCookieName()
    ];
    const result = await this.authService.logout(token, request.requestId);
    this.authService.clearSessionCookie(response);
    return result;
  }

  @Post('sessions/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @Body() dto: RevokeSessionDto,
    @Headers(CSRF_HEADER) csrfHeader: string | undefined,
    @Req() request: RequestWithId & Request,
  ) {
    assertCsrf(request, csrfHeader, this.authService.getCsrfCookieName());
    return this.authService.revokeSessionWithChallenge(
      dto.sessionManagementToken,
      dto.sessionId,
      request.requestId,
    );
  }

  @Get('sessions')
  @UseGuards(SessionGuard)
  listOwnSessions(@Req() request: AuthenticatedRequest) {
    return this.authService.listSessions(request.auth!.user.id);
  }

  @Post('sessions/:sessionId/revoke')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  async revokeOwnSession(
    @Param('sessionId') sessionId: string,
    @Headers(CSRF_HEADER) csrfHeader: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    assertCsrf(request, csrfHeader, this.authService.getCsrfCookieName());
    return this.authService.revokeOwnSession(
      request.auth!.user.id,
      sessionId,
      request.requestId,
    );
  }

  @Post('password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  @AllowPendingPasswordChange()
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Headers(CSRF_HEADER) csrfHeader: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    assertCsrf(request, csrfHeader, this.authService.getCsrfCookieName());
    return this.authService.changePassword(
      request.auth!.sessionId,
      dto.currentPassword,
      dto.newPassword,
      request.requestId,
    );
  }
}
