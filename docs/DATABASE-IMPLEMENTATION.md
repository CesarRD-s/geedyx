# Geedyx — Base de datos implementada

## Alcance de esta primera migración

La migración `20260920170000_init_foundation` prepara la base transversal sin adelantar módulos ERP que todavía están pendientes de definición técnica.

Incluye:

- `Installation` singleton lógico con estados `PENDING` y `COMPLETED`.
- `Company` para el único negocio de la instalación.
- `User`, `Role`, `Permission`, `UserRole` y `RolePermission` para el inicio de RBAC.
- `AuditEvent` como registro funcional append-only a nivel de aplicación.
- `IdempotencyRecord` para comandos que requieren protección contra reintentos.
- Vencimiento de contraseñas temporales mediante `User.passwordExpiresAt`.

## Reglas aplicadas

- Los IDs son opacos `cuid`.
- El correo del usuario es único.
- La instalación conserva una clave única `default`.
- Una instalación solo referencia una compañía y un Owner.
- Los roles son únicos por compañía y código.
- Los permisos tienen códigos estables.
- Las relaciones de asignación usan claves compuestas y cascada controlada.
- Los timestamps se almacenan como `TIMESTAMP(3)` y representan instantes UTC desde la aplicación.
- El Owner se crea con Argon2id; nunca se persiste la contraseña original.

## Comandos

```text
pnpm db:generate
pnpm db:migrate
pnpm db:migrate:deploy
pnpm db:status
pnpm db:seed
```

`pnpm db:reset` exige `NODE_ENV=development` y `GEEDYX_CONFIRM_DB_RESET=YES`.

`SHADOW_DATABASE_URL` se reserva para `prisma migrate dev` y las operaciones de desarrollo que necesitan una base shadow. No se utiliza como base funcional.

## Estado de validación

PostgreSQL 17 se valida localmente mediante Docker Desktop y el contenedor
`geedyx-postgres-1`. La base queda preparada con:

- migraciones aplicadas mediante `pnpm db:migrate:deploy`;
- seed idempotente de la instalación y permisos;
- Prisma Client generado;
- esquema actualizado según `pnpm db:status`;
- conexión API → PostgreSQL confirmada por `GET /health/ready`;
- lectura real de `Installation` confirmada por `GET /api/v1/setup/status`.

La validación ampliada todavía debe cubrir como escenarios específicos:

1. Creación concurrente del Owner.
2. Reintento con `Idempotency-Key` igual y con payload diferente.
3. Rollback completo ante error transaccional.
