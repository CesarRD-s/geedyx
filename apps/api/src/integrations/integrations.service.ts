import argon2 from 'argon2';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  AuditAction,
  AuditActor,
  AuditResult,
  AuditService,
  type AuditRequestContext,
} from '../audit/audit.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateIntegrationClientDto } from './dto/create-integration-client.dto.js';

const INTEGRATION_SCOPES = new Set([
  'catalog.read',
  'inventory.read',
  'orders.write',
  'customers.write',
]);

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(companyId: string) {
    return this.prisma.integrationClient.findMany({
      where: { companyId },
      select: {
        id: true,
        clientId: true,
        name: true,
        scopes: true,
        expiresAt: true,
        revokedAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    companyId: string,
    actorId: string,
    dto: CreateIntegrationClientDto,
    context: AuditRequestContext,
  ) {
    if (dto.expiresAt && dto.expiresAt <= new Date()) {
      throw new BadRequestException(
        'Integration credential expiry must be in the future',
      );
    }
    const scopes = [...new Set(dto.scopes)];
    if (scopes.some((scope) => !INTEGRATION_SCOPES.has(scope))) {
      throw new BadRequestException(
        'One or more integration scopes are not supported',
      );
    }
    return this.issue(
      companyId,
      actorId,
      dto.name.trim(),
      scopes,
      dto.expiresAt,
      context,
      AuditAction.IntegrationClientCreate,
    );
  }

  async rotate(
    companyId: string,
    actorId: string,
    id: string,
    context: AuditRequestContext,
  ) {
    const client = await this.prisma.integrationClient.findFirst({
      where: { id, companyId, revokedAt: null },
      select: { name: true, scopes: true },
    });
    if (!client) {
      throw new NotFoundException('Integration client not found');
    }
    return this.prisma.$transaction(async (tx) => {
      const secret = randomBytes(32).toString('base64url');
      const updated = await tx.integrationClient.update({
        where: { id },
        data: {
          secretHash: await argon2.hash(secret, { type: argon2.argon2id }),
        },
        select: {
          id: true,
          clientId: true,
          name: true,
          scopes: true,
          expiresAt: true,
          createdAt: true,
        },
      });
      await this.audit.record(
        {
          companyId,
          actorType: AuditActor.InternalUser,
          actorId,
          action: AuditAction.IntegrationClientRotate,
          outcome: AuditResult.Succeeded,
          targetType: 'integration_client',
          targetId: id,
          ...context,
        },
        tx,
      );
      return { ...updated, secret };
    });
  }

  async revoke(
    companyId: string,
    actorId: string,
    id: string,
    context: AuditRequestContext,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.integrationClient.updateMany({
        where: { id, companyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (result.count !== 1) {
        throw new NotFoundException('Integration client not found');
      }
      await this.audit.record(
        {
          companyId,
          actorType: AuditActor.InternalUser,
          actorId,
          action: AuditAction.IntegrationClientRevoke,
          outcome: AuditResult.Succeeded,
          targetType: 'integration_client',
          targetId: id,
          ...context,
        },
        tx,
      );
    });
  }

  private async issue(
    companyId: string,
    actorId: string,
    name: string,
    scopes: string[],
    expiresAt: Date | undefined,
    context: AuditRequestContext,
    action: typeof AuditAction.IntegrationClientCreate,
  ) {
    const secret = randomBytes(32).toString('base64url');
    const secretHash = await argon2.hash(secret, { type: argon2.argon2id });
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.integrationClient.create({
        data: {
          companyId,
          name,
          scopes,
          expiresAt,
          secretHash,
          clientId: `gxc_${randomBytes(16).toString('base64url')}`,
        },
        select: {
          id: true,
          clientId: true,
          name: true,
          scopes: true,
          expiresAt: true,
          createdAt: true,
        },
      });
      await this.audit.record(
        {
          companyId,
          actorType: AuditActor.InternalUser,
          actorId,
          action,
          outcome: AuditResult.Succeeded,
          targetType: 'integration_client',
          targetId: client.id,
          ...context,
        },
        tx,
      );
      return { ...client, secret };
    });
  }
}
