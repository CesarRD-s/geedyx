import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../authorization/authenticated-request.js';
import {
  REQUIRED_PERMISSIONS,
} from '../authorization/require-permissions.decorator.js';
import type { PermissionCode } from '../authorization/permissions.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionCode[]>(
      REQUIRED_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const grantedPermissions = new Set(request.user.permissions);
    if (requiredPermissions.every((permission) => grantedPermissions.has(permission))) {
      return true;
    }
    throw new ForbiddenException('Insufficient permissions');
  }
}
