import argon2 from 'argon2';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface IntegrationPrincipal {
  id: string;
  companyId: string;
  scopes: string[];
}

@Injectable()
export class IntegrationAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async authenticate(
    clientId: string | undefined,
    secret: string | undefined,
  ): Promise<IntegrationPrincipal> {
    if (!clientId || !secret) throw new UnauthorizedException();
    const client = await this.prisma.integrationClient.findUnique({
      where: { clientId },
      select: {
        id: true,
        companyId: true,
        scopes: true,
        secretHash: true,
        revokedAt: true,
        expiresAt: true,
      },
    });
    if (
      !client ||
      client.revokedAt ||
      (client.expiresAt && client.expiresAt <= new Date()) ||
      !(await argon2.verify(client.secretHash, secret))
    ) {
      throw new UnauthorizedException();
    }
    await this.prisma.integrationClient.update({
      where: { id: client.id },
      data: { lastUsedAt: new Date() },
    });
    return {
      id: client.id,
      companyId: client.companyId,
      scopes: client.scopes,
    };
  }
}
