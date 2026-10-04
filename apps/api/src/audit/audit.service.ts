import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuditResponse } from '@geedyx/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { paginationMeta } from '../http/pagination.dto';
import type { ListAuditDto } from './dto/list-audit.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actorUserId: string, dto: ListAuditDto): Promise<AuditResponse> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { companyId: true },
    });
    if (!actor) {
      throw new NotFoundException({
        code: 'ACTOR_NOT_FOUND',
        detail: 'No se encontró el usuario de la sesión.',
      });
    }

    const query = dto.query?.trim();
    const where = {
      companyId: actor.companyId,
      ...(dto.module ? { module: dto.module } : {}),
      ...(dto.action ? { action: dto.action } : {}),
      ...(dto.outcome ? { outcome: dto.outcome } : {}),
      ...(query
        ? {
            OR: [
              { entityId: { contains: query, mode: 'insensitive' as const } },
              { requestId: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [events, total] = await this.prisma.$transaction([
      this.prisma.auditEvent.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
        orderBy: { occurredAt: 'desc' },
        skip: dto.skip,
        take: dto.take,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return {
      events: events.map((event) => ({
        id: event.id,
        module: event.module,
        action: event.action,
        outcome: event.outcome,
        entityType: event.entityType,
        entityId: event.entityId,
        actorUserId: event.actorUserId,
        actorDisplayName: event.actor?.displayName ?? null,
        requestId: event.requestId,
        metadata: event.metadata,
        occurredAt: event.occurredAt.toISOString(),
      })),
      total,
      pagination: paginationMeta(dto.page, dto.pageSize, total),
    };
  }
}
