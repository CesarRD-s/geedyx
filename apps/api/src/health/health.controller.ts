import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  @HttpCode(HttpStatus.OK)
  live() {
    return { status: 'ok', service: 'api' };
  }

  @Get('ready')
  async ready(@Res({ passthrough: true }) response: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', dependencies: { database: 'up' } };
    } catch {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { status: 'not_ready', dependencies: { database: 'down' } };
    }
  }
}
