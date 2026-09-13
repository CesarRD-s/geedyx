import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../authorization/authenticated-request.js';
import { REQUIRED_PERMISSIONS } from '../authorization/require-permissions.decorator.js';
import type { PermissionCode } from '../authorization/permissions.js';
import {
  AuditAction,
  AuditActor,
  AuditResult,
  AuditService,
} from '../../audit/audit.service.js';
import { requestAuditContext } from '../../audit/request-audit-context.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      PermissionCode[]
    >(REQUIRED_PERMISSIONS, [context.getHandler(), context.getClass()]);
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const grantedPermissions = new Set(request.user.permissions);
    if (
      requiredPermissions.every((permission) =>
        grantedPermissions.has(permission),
      )
    ) {
      return true;
    }
    await this.audit.record({
      companyId: request.user.companyId,
      actorType: AuditActor.InternalUser,
      actorId: request.user.id,
      action: AuditAction.AuthorizationDeny,
      outcome: AuditResult.Denied,
      targetType: 'permission',
      targetId: [...requiredPermissions].sort().join(','),
      ...requestAuditContext(request),
      metadata: { reason: 'insufficient_permissions' },
    });
    throw new ForbiddenException('Insufficient permissions');
  }
}
