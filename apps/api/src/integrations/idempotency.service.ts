import { createHash } from 'node:crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';

export interface IdempotentResponse {
  status: number;
  body: Prisma.InputJsonValue;
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    clientId: string,
    operation: string,
    key: string,
    request: unknown,
    action: () => Promise<IdempotentResponse>,
  ): Promise<IdempotentResponse> {
    const keyHash = digest(key);
    const requestHash = digest(JSON.stringify(request));
    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: {
        integrationClientId_operation_keyHash: {
          integrationClientId: clientId,
          operation,
          keyHash,
        },
      },
    });
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException(
          'Idempotency key was used with a different request',
        );
      }
      if (
        existing.completedAt &&
        existing.responseStatus !== null &&
        existing.responseBody !== null
      ) {
        return { status: existing.responseStatus, body: existing.responseBody };
      }
      throw new ConflictException('Idempotency request is already in progress');
    }
    let record: { id: string };
    try {
      record = await this.prisma.idempotencyRecord.create({
        data: {
          integrationClientId: clientId,
          operation,
          keyHash,
          requestHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        select: { id: true },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return this.execute(clientId, operation, key, request, action);
      }
      throw error;
    }
    let response: IdempotentResponse;
    try {
      response = await action();
    } catch (error) {
      await this.prisma.idempotencyRecord.delete({ where: { id: record.id } });
      throw error;
    }
    await this.prisma.idempotencyRecord.update({
      where: { id: record.id },
      data: {
        responseStatus: response.status,
        responseBody: response.body,
        completedAt: new Date(),
      },
    });
    return response;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
