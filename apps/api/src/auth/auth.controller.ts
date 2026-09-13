import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiCookieAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthenticatedRequest } from './authorization/authenticated-request.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { SetupDto } from './dto/setup.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ReauthenticateDto } from './dto/reauthenticate.dto.js';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { SessionAuthGuard } from './guards/session-auth.guard.js';
import { AccountStatusGuard } from './guards/account-status.guard.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from './session.constants.js';

const LOGIN_ATTEMPTS = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('setup')
  @HttpCode(HttpStatus.CREATED)
  @Throttle(LOGIN_ATTEMPTS)
  async setup(
    @Body() dto: SetupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.setup(dto);
    this.setSessionCookie(res, session.token, session.cookieMaxAge);
    this.setCsrfCookie(res, session.csrfToken, session.cookieMaxAge);
    return session.user;
  }

  @Get('installation')
  async installation() {
    return this.authService.getInstallationStatus();
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(LOGIN_ATTEMPTS)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.login(dto);
    this.setSessionCookie(res, session.token, session.cookieMaxAge);
    this.setCsrfCookie(res, session.csrfToken, session.cookieMaxAge);
    return session.user;
  }

  @Get('me')
  @UseGuards(SessionAuthGuard, AccountStatusGuard)
  @ApiCookieAuth()
  async me(@Req() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.id);
  }

  @Patch('profile')
  @UseGuards(SessionAuthGuard, AccountStatusGuard)
  @ApiCookieAuth()
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (req.user.sessionId) {
      await this.authService.revokeSession(req.user.sessionId);
    }
    res.clearCookie(AUTH_COOKIE_NAME, this.cookieOptions());
    res.clearCookie(CSRF_COOKIE_NAME, {
      ...this.cookieOptions(),
      httpOnly: false,
    });
  }

  @Get('sessions')
  @UseGuards(SessionAuthGuard, AccountStatusGuard)
  async sessions(@Req() req: AuthenticatedRequest) {
    return this.authService.listSessions(req.user.id, req.user.sessionId ?? '');
  }

  @Post('sessions/revoke-others')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard, AccountStatusGuard)
  async revokeOthers(@Req() req: AuthenticatedRequest) {
    await this.authService.revokeOtherSessions(
      req.user.id,
      req.user.sessionId ?? '',
    );
  }

  @Post('sessions/:id/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard, AccountStatusGuard)
  async revokeSession(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    await this.authService.revokeSessionForUser(req.user.id, id);
  }

  @Post('password/change')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard, AccountStatusGuard)
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
      req.user.sessionId ?? '',
    );
  }

  @Post('reauthenticate')
  @HttpCode(HttpStatus.OK)
  @Throttle(LOGIN_ATTEMPTS)
  @UseGuards(SessionAuthGuard, AccountStatusGuard)
  async reauthenticate(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ReauthenticateDto,
  ) {
    return this.authService.reauthenticate(
      req.user.id,
      req.user.sessionId ?? '',
      dto.password,
    );
  }

  @Post('password/reset-request')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle(LOGIN_ATTEMPTS)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(dto.email);
    return { accepted: true };
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(LOGIN_ATTEMPTS)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(
      dto.token,
      dto.newPassword,
      dto.confirmPassword,
    );
  }

  private setCsrfCookie(res: Response, token: string, maxAge: number): void {
    res.cookie(CSRF_COOKIE_NAME, token, {
      ...this.cookieOptions(),
      httpOnly: false,
      maxAge,
    });
  }

  private setSessionCookie(res: Response, token: string, maxAge: number): void {
    res.cookie(AUTH_COOKIE_NAME, token, {
      ...this.cookieOptions(),
      maxAge,
    });
  }

  private cookieOptions() {
    const secure = this.configService.get<boolean>('COOKIE_SECURE', false);
    return {
      httpOnly: true,
      secure,
      sameSite: 'lax' as const,
      path: '/',
    };
  }
}
