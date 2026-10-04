import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from './auth.types';
import { REQUIRED_PERMISSION_KEY } from './require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        detail: 'La sesión no es válida o ya expiró.',
      });
    }
    if (!request.auth.user.permissions.includes(requiredPermission)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        detail: 'No tienes permisos para realizar esta operación.',
      });
    }

    return true;
  }
}
