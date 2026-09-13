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

@Injectable()
export class AccountStatusGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

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
      throw new UnauthorizedException('User not found');
    }
    if (user.status === 'SUSPENDED') {
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
}
