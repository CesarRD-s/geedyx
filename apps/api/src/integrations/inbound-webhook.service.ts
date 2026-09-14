import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class InboundWebhookService {
  constructor(private readonly prisma: PrismaService) {}
  async reserve(provider: string, eventId: string): Promise<boolean> {
    try {
      await this.prisma.inboundWebhookEvent.create({
        data: { provider, eventId },
      });
      return true;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      )
        return false;
      throw error;
    }
  }
}
