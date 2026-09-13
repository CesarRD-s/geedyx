import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto.js';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}
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
  update(companyId: string, dto: UpdateCompanySettingsDto) {
    const hasValues = Object.values(dto).some(
      (value) => value !== undefined && value !== '',
    );
    return this.prisma.company.update({
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
  }
}
