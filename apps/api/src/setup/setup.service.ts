import {
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { OwnerCreated, SetupStatus } from '@geedyx/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../auth/password';
import { getErrorDiagnostics } from '../http/error-diagnostics';
import type { CreateOwnerDto } from './dto/create-owner.dto';

const SETUP_OPERATION = 'setup.owner.create';

@Injectable()
export class SetupService {
  private readonly logger = new Logger(SetupService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getStatus(requestId?: string): Promise<SetupStatus> {
    try {
      const [installation, permissionCount] = await Promise.all([
        this.prisma.installation.findUnique({
          where: { key: 'default' },
          select: {
            ownerId: true,
            status: true,
          },
        }),
        this.prisma.permission.count(),
      ]);
      const installationStatus = installation?.status ?? 'PENDING';
      const installationRecordExists = Boolean(installation);
      const permissionCatalogReady = permissionCount > 0;
      const ready =
        installationRecordExists &&
        permissionCatalogReady &&
        installationStatus === 'PENDING' &&
        !installation?.ownerId;

      if (installation?.status === 'PENDING' && installation.ownerId) {
        this.logger.warn(
          JSON.stringify({
            event: 'setup.status.inconsistent',
            reason: 'pending_installation_has_owner',
            requestId: requestId ?? 'unknown',
          }),
        );
      }

      if (!installationRecordExists || !permissionCatalogReady) {
        this.logger.warn(
          JSON.stringify({
            event: 'setup.status.incomplete',
            installationRecord: installationRecordExists ? 'present' : 'missing',
            permissionCatalog: permissionCatalogReady ? 'ready' : 'missing',
            requestId: requestId ?? 'unknown',
          }),
        );
      }

      this.logger.log(
        JSON.stringify({
          event: 'setup.status.checked',
          installationRecord: installationRecordExists ? 'present' : 'missing',
          installationStatus,
          permissionCount,
          ready,
          requestId: requestId ?? 'unknown',
        }),
      );

      return {
        installationStatus,
        ready,
      };
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'setup.status.failed',
          reason: 'database_unavailable',
          requestId: requestId ?? 'unknown',
          ...getErrorDiagnostics(error),
        }),
      );
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
    const passwordHash = await hashPassword(dto.password);

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

          if (permissions.length === 0) {
            throw new ServiceUnavailableException({
              code: 'PERMISSIONS_NOT_INITIALIZED',
              detail: 'La preparación inicial de Geedyx no está completa.',
            });
          }

          await tx.rolePermission.createMany({
            data: permissions.map((permission) => ({
              roleId: role.id,
              permissionId: permission.id,
            })),
          });

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
      this.logger.error(
        JSON.stringify({
          event: 'setup.owner.failed',
          requestId: requestId ?? 'unknown',
          ...getErrorDiagnostics(error),
        }),
      );
      throw error;
    }
  }
}
