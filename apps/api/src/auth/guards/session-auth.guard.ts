import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AUTH_COOKIE_NAME } from '../session.constants.js';
import { durationToMs } from '../duration.js';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: { id: string; email: string; companyId: string; sessionId: string } }>();
    const token = request.cookies?.[AUTH_COOKIE_NAME];
    if (typeof token !== 'string' || token.length === 0) throw new UnauthorizedException('Authentication required');
    const now = new Date();
    const session = await this.prisma.session.findUnique({ where: { tokenHash: createHash('sha256').update(token).digest('hex') }, select: { id: true, userId: true, csrfTokenHash: true, idleExpiresAt: true, expiresAt: true, revokedAt: true, user: { select: { email: true, companyId: true } } } });
    if (!session || session.revokedAt || session.idleExpiresAt <= now || session.expiresAt <= now) throw new UnauthorizedException('Session expired');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const csrfToken = request.header('x-csrf-token');
      const suppliedHash = typeof csrfToken === 'string' ? createHash('sha256').update(csrfToken).digest('hex') : '';
      if (!suppliedHash || !timingSafeEqual(Buffer.from(session.csrfTokenHash), Buffer.from(suppliedHash))) {
        throw new UnauthorizedException('Invalid CSRF token');
      }
    }
    const nextIdleExpiry = new Date(now.getTime() + durationToMs(this.config.get<string>('SESSION_IDLE_TTL', '30m')));
    await this.prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: now, idleExpiresAt: nextIdleExpiry > session.expiresAt ? session.expiresAt : nextIdleExpiry } });
    request.user = { id: session.userId, email: session.user.email, companyId: session.user.companyId, sessionId: session.id };
    return true;
  }
}

