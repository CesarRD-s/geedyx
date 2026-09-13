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
        requestId: 'request-1',
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        header: vi.fn().mockReturnValue(undefined),
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
  it('allows a request with every required permission', async () => {
    const reflector = {
      getAllAndOverride: vi
        .fn()
        .mockReturnValue([
          PermissionCode.CatalogRead,
          PermissionCode.CatalogManage,
        ]),
    } as unknown as Reflector;
    const audit = { record: vi.fn() };
    const guard = new PermissionsGuard(reflector, audit as never);

    await expect(
      guard.canActivate(
        contextWithPermissions([
          PermissionCode.CatalogRead,
          PermissionCode.CatalogManage,
        ]),
      ),
    ).resolves.toBe(true);
  });

  it('records and rejects a request missing a required permission', async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([PermissionCode.UsersManage]),
    } as unknown as Reflector;
    const audit = { record: vi.fn().mockResolvedValue({}) };
    const guard = new PermissionsGuard(reflector, audit as never);

    await expect(
      guard.canActivate(contextWithPermissions([PermissionCode.UsersRead])),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'authorization.deny',
        outcome: 'DENIED',
        targetId: PermissionCode.UsersManage,
        metadata: { reason: 'insufficient_permissions' },
      }),
    );
  });
});
