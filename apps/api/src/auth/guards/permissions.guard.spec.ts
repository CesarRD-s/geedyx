import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PermissionCode } from '../authorization/permissions.js';
import { PermissionsGuard } from './permissions.guard.js';

function contextWithPermissions(
  permissions: PermissionCode[],
): ExecutionContext {
  return {
    getHandler: () => PermissionsGuard,
    getClass: () => PermissionsGuard,
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          id: 'user',
          email: 'user@example.com',
          companyId: 'company',
          permissions,
        },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  it('allows a request with every required permission', () => {
    const reflector = {
      getAllAndOverride: vi
        .fn()
        .mockReturnValue([
          PermissionCode.CatalogRead,
          PermissionCode.CatalogManage,
        ]),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(
      guard.canActivate(
        contextWithPermissions([
          PermissionCode.CatalogRead,
          PermissionCode.CatalogManage,
        ]),
      ),
    ).toBe(true);
  });

  it('rejects a request missing a required permission', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([PermissionCode.UsersManage]),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(() =>
      guard.canActivate(contextWithPermissions([PermissionCode.UsersRead])),
    ).toThrow(ForbiddenException);
  });
});
