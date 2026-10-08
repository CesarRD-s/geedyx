import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CompanyConfiguration } from '@geedyx/contracts';
import { assertValidTimeZone } from '../config/time-zone';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateConfigurationDto } from './dto/update-configuration.dto';

const REQUIRED_CONFIGURATION_FIELDS = [
  'name',
  'country',
  'timeZone',
  'currency',
  'locale',
  'dateFormat',
  'timeFormat',
] as const;

@Injectable()
export class ConfigurationService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfiguration(actorUserId: string): Promise<CompanyConfiguration> {
    const company = await this.findCompany(actorUserId);
    return this.toConfiguration(company);
  }

  async updateConfiguration(
    actorUserId: string,
    dto: UpdateConfigurationDto,
    requestId: string | undefined,
  ): Promise<CompanyConfiguration> {
    const company = await this.findCompany(actorUserId);
    const data = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.country !== undefined ? { country: this.clean(dto.country) } : {}),
      ...(dto.logoUrl !== undefined ? { logoUrl: this.clean(dto.logoUrl) } : {}),
      ...(dto.locale !== undefined ? { locale: dto.locale } : {}),
      ...(dto.timeZone !== undefined ? { timeZone: this.clean(dto.timeZone) } : {}),
      ...(dto.currency !== undefined
        ? { currency: this.clean(dto.currency)?.toUpperCase() ?? null }
        : {}),
      ...(dto.dateFormat !== undefined ? { dateFormat: dto.dateFormat } : {}),
      ...(dto.timeFormat !== undefined ? { timeFormat: dto.timeFormat } : {}),
    };

    if (data.name === '') {
      throw new BadRequestException({
        code: 'CONFIGURATION_NAME_REQUIRED',
        detail: 'El nombre del negocio es obligatorio.',
      });
    }

    if (data.timeZone !== undefined && data.timeZone !== null) {
      assertValidTimeZone(data.timeZone);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.company.update({
        where: { id: company.id },
        data,
      });
      await tx.auditEvent.create({
        data: {
          companyId: company.id,
          actorUserId,
          module: 'configuration',
          action: 'CONFIGURATION_UPDATED',
          outcome: 'SUCCESS',
          entityType: 'Company',
          entityId: company.id,
          requestId,
          metadata: {
            fields: Object.keys(data),
          },
        },
      });
      return result;
    });

    return this.toConfiguration(updated);
  }

  private async findCompany(actorUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { company: true },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'COMPANY_NOT_FOUND',
        detail: 'No se encontró la empresa del usuario.',
      });
    }
    return user.company;
  }

  private clean(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  private toConfiguration(company: {
    id: string;
    name: string;
    logoUrl: string | null;
    country: string | null;
    locale: string;
    timeZone: string | null;
    currency: string | null;
    dateFormat: string;
    timeFormat: string;
  }): CompanyConfiguration {
    const values = {
      name: company.name.trim(),
      country: company.country,
      timeZone: company.timeZone,
      currency: company.currency,
      locale: company.locale,
      dateFormat: company.dateFormat,
      timeFormat: company.timeFormat,
    };
    const isComplete = REQUIRED_CONFIGURATION_FIELDS.every((field) => {
      const value = values[field];
      return typeof value === 'string' && value.trim().length > 0;
    });

    return {
      id: company.id,
      name: company.name,
      logoUrl: company.logoUrl,
      country: company.country,
      locale: company.locale,
      timeZone: company.timeZone,
      currency: company.currency,
      dateFormat: company.dateFormat,
      timeFormat: company.timeFormat,
      isComplete,
    };
  }
}
