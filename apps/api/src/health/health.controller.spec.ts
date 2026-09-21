import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller';
import type { PrismaService } from '../prisma/prisma.service';

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('HealthController', () => {
  it('reports the API as live without requiring the database', () => {
    const prisma = {
      $queryRaw: vi.fn(),
    } as unknown as PrismaService;
    const controller = new HealthController(prisma);

    expect(controller.live()).toEqual({
      status: 'ok',
      service: 'api',
    });
  });

  it('reports the database as ready when SELECT 1 succeeds', async () => {
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService;
    const controller = new HealthController(prisma);
    const response = createResponse();

    await expect(controller.ready(response)).resolves.toEqual({
      status: 'ok',
      dependencies: {
        database: 'up',
      },
    });
    expect(response.status).not.toHaveBeenCalled();
  });

  it('reports service unavailable when the database query fails', async () => {
    const prisma = {
      $queryRaw: vi.fn().mockRejectedValue(new Error('database offline')),
    } as unknown as PrismaService;
    const controller = new HealthController(prisma);
    const response = createResponse();

    await expect(controller.ready(response)).resolves.toEqual({
      status: 'not_ready',
      dependencies: {
        database: 'down',
      },
    });
    expect(response.status).toHaveBeenCalledWith(503);
  });
});
