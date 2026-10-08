import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { hashPassword } from '../auth/password';
import type { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';
import type { IssueTemporaryPasswordDto } from './dto/issue-temporary-password.dto';

describe('UsersService Owner protections', () => {
  it('prevents an Admin from issuing a temporary password for an Owner', async () => {
    const prisma = {
      $transaction: vi.fn(),
      user: {
        findFirst: vi.fn().mockResolvedValue({
          companyId: 'company-1',
          id: 'owner-1',
          roles: [{ role: { code: 'OWNER' } }],
        }),
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ id: 'admin-1', companyId: 'company-1' })
          .mockResolvedValueOnce({
            passwordHash: 'unused-hash',
            roles: [{ role: { code: 'ADMIN' } }],
          }),
      },
    };
    const service = new UsersService(prisma as unknown as PrismaService);

    await expect(
      service.issueTemporaryPassword(
        'admin-1',
        'owner-1',
        {
          currentPassword: 'Admin-password-1!',
          reason: 'Owner account recovery',
        } as IssueTemporaryPasswordDto,
        'request-1',
      ),
    ).rejects.toMatchObject({
      response: { code: 'OWNER_ROLE_REQUIRES_OWNER' },
      status: 403,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('requires the current password before a reauthenticated Owner action', async () => {
    const prisma = {
      $transaction: vi.fn(),
      user: {
        findFirst: vi.fn().mockResolvedValue({
          companyId: 'company-1',
          id: 'owner-2',
          roles: [{ role: { code: 'OWNER' } }],
        }),
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ id: 'owner-1', companyId: 'company-1' })
          .mockResolvedValueOnce({
            passwordHash: 'unused-hash',
            roles: [{ role: { code: 'OWNER' } }],
          }),
      },
    };
    const service = new UsersService(prisma as unknown as PrismaService);

    await expect(
      service.issueTemporaryPassword(
        'owner-1',
        'owner-2',
        { reason: 'Owner account recovery' } as IssueTemporaryPasswordDto,
        'request-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('allows a reauthenticated Owner to issue a password for another Owner', async () => {
    const currentPassword = 'Owner-current-password-1!';
    const passwordHash = await hashPassword(currentPassword);
    const target = {
      companyId: 'company-1',
      createdAt: new Date('2026-10-07T12:00:00.000Z'),
      displayName: 'Second Owner',
      email: 'owner-2@example.com',
      id: 'owner-2',
      passwordChangeRequired: false,
      roles: [{ role: { code: 'OWNER' } }],
      status: 'ACTIVE',
    };
    const updatedTarget = {
      ...target,
      passwordChangeRequired: true,
    };
    const transaction = {
      auditEvent: { create: vi.fn().mockResolvedValue({}) },
      session: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      user: {
        findFirst: vi.fn().mockResolvedValue(target),
        update: vi.fn().mockResolvedValue(updatedTarget),
      },
      userRole: {
        findFirst: vi.fn().mockResolvedValue({ userId: 'owner-1' }),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (operation: (tx: never) => Promise<unknown>) =>
        operation(transaction as never),
      ),
      user: {
        findFirst: vi.fn().mockResolvedValue(target),
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ id: 'owner-1', companyId: 'company-1' })
          .mockResolvedValueOnce({
            passwordHash,
            roles: [{ role: { code: 'OWNER' } }],
          }),
      },
    };
    const service = new UsersService(prisma as unknown as PrismaService);

    const result = await service.issueTemporaryPassword(
      'owner-1',
      'owner-2',
      {
        currentPassword,
        reason: 'Owner account recovery',
      } as IssueTemporaryPasswordDto,
      'request-1',
    );

    expect(result.user.passwordChangeRequired).toBe(true);
    expect(result.temporaryPassword).toEqual(expect.any(String));
    expect(transaction.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passwordChangeRequired: true }),
        where: { id: 'owner-2' },
      }),
    );
    expect(transaction.session.updateMany).toHaveBeenCalled();
    expect(transaction.auditEvent.create).toHaveBeenCalled();
  });

  it('keeps role listing read-only', async () => {
    const prisma = {
      $transaction: vi.fn(),
      role: {
        findMany: vi.fn().mockResolvedValue([
          {
            code: 'OWNER',
            description: 'System owner profile',
            id: 'role-owner',
            isSystem: true,
            name: 'Owner',
            _count: { users: 1 },
            permissions: [{ permission: { code: 'users.manage' } }],
          },
        ]),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ companyId: 'company-1' }),
      },
    };
    const service = new UsersService(prisma as unknown as PrismaService);

    await expect(service.listRoles('owner-1')).resolves.toMatchObject({
      roles: [{ code: 'OWNER', permissions: ['users.manage'] }],
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
