import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiCookieAuth } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { SetupDto } from './dto/setup.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AUTH_COOKIE_NAME } from './strategies/jwt.strategy.js';

const LOGIN_ATTEMPTS = { default: { limit: 5, ttl: 60_000 } };

export interface AuthenticatedUser {
  id: string;
  email: string;
  companyId: string;
}

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

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
    return session.user;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  async me(@Req() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.id);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE_NAME, this.cookieOptions());
  }

  private setSessionCookie(
    res: Response,
    token: string,
    maxAge: number,
  ): void {
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
