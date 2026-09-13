import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedRequest } from '../authorization/authenticated-request.js';
import { durationToMs } from '../duration.js';

@Injectable()
export class RecentAuthenticationGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const sessionId = request.user.sessionId;
    if (!sessionId) {
      throw this.requiredException();
    }

    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: request.user.id,
        revokedAt: null,
      },
      select: { reauthenticatedAt: true },
    });
    const threshold =
      Date.now() -
      durationToMs(
        this.config.get<string>('REAUTHENTICATION_TTL', '10m'),
      );

    if (!session || session.reauthenticatedAt.getTime() < threshold) {
      throw this.requiredException();
    }
    return true;
  }

  private requiredException(): ForbiddenException {
    return new ForbiddenException({
      code: 'REAUTHENTICATION_REQUIRED',
      message: 'Recent authentication required',
    });
  }
}
