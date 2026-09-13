import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AuditAction,
  AuditActor,
  AuditResult,
  AuditService,
  type AuditRequestContext,
} from '../audit/audit.service.js';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto.js';

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}
  get(companyId: string) {
    return this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: {
        name: true,
        locale: true,
        timeZone: true,
        currency: true,
        configuredAt: true,
      },
    });
  }
  update(
    companyId: string,
    actorUserId: string,
    dto: UpdateCompanySettingsDto,
    auditContext: AuditRequestContext,
  ) {
    const hasValues = Object.values(dto).some(
      (value) => value !== undefined && value !== '',
    );
    const changedFieldCount = Object.values(dto).filter(
      (value) => value !== undefined,
    ).length;
    return this.prisma.$transaction(async (transaction) => {
      const company = await transaction.company.update({
        where: { id: companyId },
        data: { ...dto, configuredAt: hasValues ? new Date() : undefined },
        select: {
          name: true,
          locale: true,
          timeZone: true,
          currency: true,
          configuredAt: true,
        },
      });
      await this.audit.record(
        {
          companyId,
          actorType: AuditActor.InternalUser,
          actorId: actorUserId,
          action: AuditAction.CompanySettingsUpdate,
          outcome: AuditResult.Succeeded,
          targetType: 'company',
          targetId: companyId,
          ...auditContext,
          metadata: { changedFieldCount },
        },
        transaction,
      );
      return company;
    });
  }
}
