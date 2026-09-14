import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const AuditActor = {
  Anonymous: 'ANONYMOUS',
  InternalUser: 'INTERNAL_USER',
  System: 'SYSTEM',
  IntegrationClient: 'INTEGRATION_CLIENT',
} as const;

export type AuditActor = (typeof AuditActor)[keyof typeof AuditActor];

export const AuditResult = {
  Succeeded: 'SUCCEEDED',
  Failed: 'FAILED',
  Denied: 'DENIED',
} as const;

export type AuditResult = (typeof AuditResult)[keyof typeof AuditResult];

export const AuditAction = {
  InstallationComplete: 'installation.complete',
  Login: 'authentication.login',
  Logout: 'authentication.logout',
  Reauthentication: 'authentication.reauthentication',
  PasswordChange: 'authentication.password.change',
  PasswordResetRequest: 'authentication.password_reset.request',
  PasswordReset: 'authentication.password_reset.complete',
  SessionRevoke: 'authentication.session.revoke',
  OtherSessionsRevoke: 'authentication.session.revoke_others',
  ProfileUpdate: 'identity.profile.update',
  UserCreate: 'identity.user.create',
  UserUpdate: 'identity.user.update',
  CompanySettingsUpdate: 'company.settings.update',
  CategoryCreate: 'catalog.category.create',
  CategoryUpdate: 'catalog.category.update',
  CategoryDelete: 'catalog.category.delete',
  ProductCreate: 'catalog.product.create',
  ProductUpdate: 'catalog.product.update',
  ProductDelete: 'catalog.product.delete',
  ProductImageUpload: 'catalog.product.image.upload',
  ProductImageDelete: 'catalog.product.image.delete',
  IntegrationClientCreate: 'integration.client.create',
  IntegrationClientRotate: 'integration.client.rotate',
  IntegrationClientRevoke: 'integration.client.revoke',
  WebhookEndpointCreate: 'webhook.endpoint.create',
  WebhookEndpointRevoke: 'webhook.endpoint.revoke',
  AuthorizationDeny: 'authorization.deny',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export type AuditMetadataValue = string | number | boolean | null;
export type AuditMetadata = Record<string, AuditMetadataValue>;

export interface AuditRequestContext {
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditEventInput {
  companyId?: string;
  actorType: AuditActor;
  actorId?: string;
  action: AuditAction;
  outcome: AuditResult;
  targetType?: string;
  targetId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: AuditMetadata;
  occurredAt?: Date;
}

type AuditDatabase = Pick<Prisma.TransactionClient, 'auditEvent'>;

const SENSITIVE_METADATA_KEY =
  /password|passphrase|token|secret|cookie|authorization|credential|csrf/i;
const MAX_METADATA_BYTES = 4_096;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    input: AuditEventInput,
    database: AuditDatabase = this.prisma,
  ): Promise<{ id: string; sequence: bigint }> {
    this.validateMetadata(input.metadata);
    return database.auditEvent.create({
      data: {
        companyId: input.companyId,
        actorType: input.actorType,
        actorId: input.actorId,
        action: input.action,
        outcome: input.outcome,
        targetType: input.targetType,
        targetId: input.targetId,
        requestId: input.requestId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: input.metadata,
        occurredAt: input.occurredAt,
      },
      select: { id: true, sequence: true },
    });
  }

  private validateMetadata(metadata: AuditMetadata | undefined): void {
    if (!metadata) return;
    const sensitiveKey = Object.keys(metadata).find((key) =>
      SENSITIVE_METADATA_KEY.test(key),
    );
    if (sensitiveKey) {
      throw new Error(
        `Sensitive audit metadata key is forbidden: ${sensitiveKey}`,
      );
    }
    if (
      Buffer.byteLength(JSON.stringify(metadata), 'utf8') > MAX_METADATA_BYTES
    ) {
      throw new Error('Audit metadata exceeds 4096 bytes');
    }
  }
}
