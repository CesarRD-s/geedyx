import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

export interface HealthResponse {
  status: 'ok';
  service: 'geedyx-api';
  timestamp: string;
}

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getLiveness(): HealthResponse {
    return this.healthResponse();
  }

  async getReadiness(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database is not ready');
    }
    return this.healthResponse();
  }

  private healthResponse(): HealthResponse {
    return {
      status: 'ok',
      service: 'geedyx-api',
      timestamp: new Date().toISOString(),
    };
  }
}
