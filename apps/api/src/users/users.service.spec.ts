import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  it('records user creation in the transaction without secret input', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'user-2',
      username: 'operator',
      email: 'operator@geedyx.test',
      displayName: null,
      locale: null,
      timeZone: null,
      status: 'INVITED',
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      roles: [],
    });
    const audit = { record: vi.fn().mockResolvedValue({}) };
    const service = new UsersService(
      {
        role: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ id: 'role-1', code: 'ADMIN' }]),
        },
        $transaction: (callback: (transaction: unknown) => unknown) =>
          callback({
            user: { create },
            userInvitation: { create: vi.fn().mockResolvedValue({}) },
          }),
      } as never,
      audit as never,
      new ConfigService({ INVITATION_TTL: '7d' }),
      { deliverInvitation: vi.fn().mockResolvedValue(true) } as never,
    );

    await service.create(
      'company-1',
      'owner-1',
      {
        username: 'operator',
        email: 'operator@geedyx.test',
        roleIds: ['role-1'],
      },
      { requestId: 'request-1' },
    );

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'identity.user.create',
        outcome: 'SUCCEEDED',
        targetId: 'user-2',
        metadata: { roleCount: 1, invitation: true },
      }),
      expect.anything(),
    );
    expect(audit.record.mock.calls[0]?.[0]).not.toHaveProperty('password');
  });
});
