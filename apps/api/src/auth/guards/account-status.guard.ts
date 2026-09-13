import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedRequest } from '../authorization/authenticated-request.js';
import {
  isPermissionCode,
  type PermissionCode,
} from '../authorization/permissions.js';
import {
  AuditAction,
  AuditActor,
  AuditResult,
  AuditService,
} from '../../audit/audit.service.js';
import { requestAuditContext } from '../../audit/request-audit-context.js';

@Injectable()
export class AccountStatusGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: request.user.id },
      select: {
        companyId: true,
        status: true,
        roles: {
          select: {
            role: {
              select: {
                permissions: {
                  select: { permission: { select: { code: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      await this.recordDenial(request, 'user_not_found');
      throw new UnauthorizedException('User not found');
    }
    if (user.status === 'SUSPENDED') {
      await this.recordDenial(request, 'account_suspended');
      throw new ForbiddenException('Account is suspended');
    }

    const permissions = new Set<PermissionCode>();
    for (const userRole of user.roles) {
      for (const rolePermission of userRole.role.permissions) {
        const { code } = rolePermission.permission;
        if (isPermissionCode(code)) {
          permissions.add(code);
        }
      }
    }

    request.user.companyId = user.companyId;
    request.user.permissions = [...permissions];
    return true;
  }

  private recordDenial(
    request: AuthenticatedRequest,
    reason: string,
  ): Promise<{ id: string; sequence: bigint }> {
    return this.audit.record({
      companyId: request.user.companyId,
      actorType: AuditActor.InternalUser,
      actorId: request.user.id,
      action: AuditAction.AuthorizationDeny,
      outcome: AuditResult.Denied,
      targetType: 'user',
      targetId: request.user.id,
      ...requestAuditContext(request),
      metadata: { reason },
    });
  }
}
