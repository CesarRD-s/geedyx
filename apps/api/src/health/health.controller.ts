import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestWithId } from '../http/request-id.middleware';
import { getErrorDiagnostics } from '../http/error-diagnostics';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  @HttpCode(HttpStatus.OK)
  live() {
    return { status: 'ok', service: 'api' };
  }

  @Get('ready')
  async ready(
    @Req() request: RequestWithId,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', dependencies: { database: 'up' } };
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'health.ready.failed',
          dependency: 'database',
          requestId: request.requestId ?? 'unknown',
          ...getErrorDiagnostics(error),
        }),
      );
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { status: 'not_ready', dependencies: { database: 'down' } };
    }
  }
}
