import { randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  AuditActor,
  AuditResult,
  AuditService,
  type AuditRequestContext,
} from '../audit/audit.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { WebhookCryptoService } from './webhook-crypto.service.js';

@Injectable()
export class WebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: WebhookCryptoService,
    private readonly audit: AuditService,
  ) {}

  async findAll(companyId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { companyId },
      select: {
        id: true,
        url: true,
        eventTypes: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEndpoint(
    companyId: string,
    actorId: string,
    url: string,
    eventTypes: string[],
    context: AuditRequestContext,
  ) {
    const secret = randomBytes(32).toString('base64url');
    const encrypted = this.crypto.encrypt(secret);
    const endpoint = await this.prisma.$transaction(async (tx) => {
      const created = await tx.webhookEndpoint.create({
        data: {
          companyId,
          url,
          eventTypes: [...new Set(eventTypes)],
          secretCiphertext: encrypted.ciphertext,
          secretNonce: encrypted.nonce,
          secretAuthTag: encrypted.authTag,
        },
        select: { id: true, url: true, eventTypes: true, createdAt: true },
      });
      await this.audit.record(
        {
          companyId,
          actorType: AuditActor.InternalUser,
          actorId,
          action: AuditAction.WebhookEndpointCreate,
          outcome: AuditResult.Succeeded,
          targetType: 'webhook_endpoint',
          targetId: created.id,
          ...context,
        },
        tx,
      );
      return created;
    });
    return { ...endpoint, secret };
  }

  async revokeEndpoint(
    companyId: string,
    actorId: string,
    id: string,
    context: AuditRequestContext,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.webhookEndpoint.updateMany({
        where: { id, companyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (result.count !== 1) {
        throw new NotFoundException('Webhook endpoint not found');
      }
      await this.audit.record(
        {
          companyId,
          actorType: AuditActor.InternalUser,
          actorId,
          action: AuditAction.WebhookEndpointRevoke,
          outcome: AuditResult.Succeeded,
          targetType: 'webhook_endpoint',
          targetId: id,
          ...context,
        },
        tx,
      );
    });
  }

  async queue(
    companyId: string,
    eventType: string,
    eventId: string,
    payload: Prisma.InputJsonValue,
  ): Promise<void> {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { companyId, revokedAt: null, eventTypes: { has: eventType } },
      select: { id: true },
    });
    await this.prisma.$transaction(
      endpoints.map((endpoint) =>
        this.prisma.webhookDelivery.upsert({
          where: {
            webhookEndpointId_eventId: {
              webhookEndpointId: endpoint.id,
              eventId,
            },
          },
          create: {
            webhookEndpointId: endpoint.id,
            eventId,
            eventType,
            payload,
            nextAttemptAt: new Date(),
          },
          update: {},
        }),
      ),
    );
  }

  async signingSecret(endpointId: string): Promise<string> {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({
      where: { id: endpointId },
      select: {
        secretCiphertext: true,
        secretNonce: true,
        secretAuthTag: true,
      },
    });
    if (!endpoint) {
      throw new NotFoundException('Webhook endpoint not found');
    }
    return this.crypto.decrypt({
      ciphertext: endpoint.secretCiphertext,
      nonce: endpoint.secretNonce,
      authTag: endpoint.secretAuthTag,
    });
  }
}
