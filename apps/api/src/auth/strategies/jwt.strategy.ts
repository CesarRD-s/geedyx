import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

export const AUTH_COOKIE_NAME = 'geedyx_session';

export interface JwtPayload {
  sub: string;
  email: string;
  companyId: string;
}

function cookieExtractor(req: Request): string | null {
  const cookies = req?.cookies as Record<string, unknown> | undefined;
  if (cookies && typeof cookies[AUTH_COOKIE_NAME] === 'string') {
    return cookies[AUTH_COOKIE_NAME];
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): { id: string; email: string; companyId: string } {
    return { id: payload.sub, email: payload.email, companyId: payload.companyId };
  }
}
