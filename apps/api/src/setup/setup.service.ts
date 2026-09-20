import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { OwnerCreated, SetupStatus } from '@geedyx/contracts';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateOwnerDto } from './dto/create-owner.dto';

const SETUP_OPERATION = 'setup.owner.create';

@Injectable()
export class SetupService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(): Promise<SetupStatus> {
    try {
      const installation = await this.prisma.installation.findUnique({
        where: { key: 'default' },
      });
      return {
        installationStatus: installation?.status ?? 'PENDING',
        ready: true,
      };
    } catch {
      throw new ServiceUnavailableException({
        code: 'DATABASE_UNAVAILABLE',
        detail: 'No se puede consultar el estado de preparación de Geedyx.',
      });
    }
  }

  async createOwner(
    dto: CreateOwnerDto,
    idempotencyKey?: string,
    requestId?: string,
  ): Promise<OwnerCreated> {
    const displayName = dto.displayName.trim();
    const email = dto.email.trim().toLowerCase();
    if (dto.password !== dto.passwordConfirmation) {
      throw new ConflictException({
        code: 'PASSWORD_MISMATCH',
        detail: 'Las contraseñas no coinciden.',
      });
    }

    const requestHash = createHash('sha256')
      .update(JSON.stringify({ displayName, email, password: dto.password }))
      .digest('hex');
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      version: 0x13,
      memoryCost: 19 * 1024,
      timeCost: 2,
      parallelism: 1,
      hashLength: 32,
    });

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          if (idempotencyKey) {
            const previous = await tx.idempotencyRecord.findUnique({
              where: {
                operation_key: { operation: SETUP_OPERATION, key: idempotencyKey },
              },
            });
            if (previous) {
              if (previous.requestHash !== requestHash) {
                throw new ConflictException({
                  code: 'IDEMPOTENCY_KEY_REUSED',
                  detail:
                    'La clave de idempotencia fue reutilizada con datos diferentes.',
                });
              }
              return previous.responseBody as unknown as OwnerCreated;
            }
          }

          const installation = await tx.installation.upsert({
            where: { key: 'default' },
            update: {},
            create: { key: 'default', status: 'PENDING' },
          });
          if (installation.status === 'COMPLETED') {
            throw new ConflictException({
              code: 'INSTALLATION_COMPLETED',
              detail: 'La instalación ya fue completada.',
            });
          }

          const company = await tx.company.create({
            data: {
              name: 'Por configurar',
            },
          });
          const owner = await tx.user.create({
            data: { companyId: company.id, displayName, email, passwordHash },
          });
          const role = await tx.role.create({
            data: {
              companyId: company.id,
              code: 'OWNER',
              name: 'Owner',
              isSystem: true,
            },
          });
          await tx.userRole.create({
            data: {
              userId: owner.id,
              roleId: role.id,
            },
          });

          const permissions = await tx.permission.findMany({
            select: {
              id: true,
            },
          });

          if (permissions.length > 0) {
            await tx.rolePermission.createMany({
              data: permissions.map((permission) => ({
                roleId: role.id,
                permissionId: permission.id,
              })),
            });
          }

          await tx.installation.update({
            where: { id: installation.id },
            data: {
              status: 'COMPLETED',
              companyId: company.id,
              ownerId: owner.id,
              completedAt: new Date(),
            },
          });
          await tx.auditEvent.createMany({
            data: [
              {
                companyId: company.id,
                actorUserId: owner.id,
                module: 'installation',
                action: 'OWNER_CREATED',
                outcome: 'SUCCESS',
                entityType: 'User',
                entityId: owner.id,
                requestId,
              },
              {
                companyId: company.id,
                actorUserId: owner.id,
                module: 'installation',
                action: 'INSTALLATION_COMPLETED',
                outcome: 'SUCCESS',
                entityType: 'Installation',
                entityId: installation.id,
                requestId,
              },
            ],
          });

          const result: OwnerCreated = {
            owner: {
              id: owner.id,
              displayName: owner.displayName,
              email: owner.email,
            },
            installationStatus: 'COMPLETED',
          };
          if (idempotencyKey) {
            await tx.idempotencyRecord.create({
              data: {
                operation: SETUP_OPERATION,
                key: idempotencyKey,
                requestHash,
                responseStatus: 201,
                responseBody: result,
              },
            });
          }
          return result;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'OWNER_ALREADY_EXISTS',
          detail: 'El correo ya está registrado.',
        });
      }
      throw error;
    }
  }
}
