import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AuditAction,
  AuditActor,
  AuditResult,
  AuditService,
} from './audit.service.js';

describe('AuditService', () => {
  it('writes a typed event through the supplied transaction client', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'event-1', sequence: 1n });
    const service = new AuditService({} as PrismaService);

    await expect(
      service.record(
        {
          companyId: 'company-1',
          actorType: AuditActor.InternalUser,
          actorId: 'user-1',
          action: AuditAction.CompanySettingsUpdate,
          outcome: AuditResult.Succeeded,
          targetType: 'company',
          targetId: 'company-1',
          requestId: 'request-1',
          metadata: { changedFieldCount: 2 },
        },
        { auditEvent: { create } } as never,
      ),
    ).resolves.toEqual({ id: 'event-1', sequence: 1n });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'company.settings.update',
        metadata: { changedFieldCount: 2 },
      }),
      select: { id: true, sequence: true },
    });
  });

  it('rejects credential-related metadata before writing', async () => {
    const create = vi.fn();
    const service = new AuditService({
      auditEvent: { create },
    } as unknown as PrismaService);

    await expect(
      service.record({
        actorType: AuditActor.Anonymous,
        action: AuditAction.Login,
        outcome: AuditResult.Failed,
        metadata: { accessToken: 'must-never-be-stored' },
      }),
    ).rejects.toThrow('Sensitive audit metadata key is forbidden');
    expect(create).not.toHaveBeenCalled();
  });
});
