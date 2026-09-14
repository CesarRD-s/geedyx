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
import {
  AuditAction,
  AuditActor,
  AuditResult,
  AuditService,
} from '../../audit/audit.service.js';
import { requestAuditContext } from '../../audit/request-audit-context.js';

@Injectable()
export class RecentAuthenticationGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const sessionId = request.user.sessionId;
    if (!sessionId) {
      await this.recordDenial(request);
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
      durationToMs(this.config.get<string>('REAUTHENTICATION_TTL', '10m'));

    if (!session || session.reauthenticatedAt.getTime() < threshold) {
      await this.recordDenial(request);
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

  private recordDenial(
    request: AuthenticatedRequest,
  ): Promise<{ id: string; sequence: bigint }> {
    return this.audit.record({
      companyId: request.user.companyId,
      actorType: AuditActor.InternalUser,
      actorId: request.user.id,
      action: AuditAction.AuthorizationDeny,
      outcome: AuditResult.Denied,
      targetType: 'session',
      targetId: request.user.sessionId,
      ...requestAuditContext(request),
      metadata: { reason: 'recent_authentication_required' },
    });
  }
}
