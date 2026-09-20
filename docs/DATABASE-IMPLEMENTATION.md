# Geedyx — Base de datos implementada

## Alcance de esta primera migración

La migración `20260920170000_init_foundation` prepara la base transversal sin adelantar módulos ERP que todavía están pendientes de definición técnica.

Incluye:

- `Installation` singleton lógico con estados `PENDING` y `COMPLETED`.
- `Company` para el único negocio de la instalación.
- `User`, `Role`, `Permission`, `UserRole` y `RolePermission` para el inicio de RBAC.
- `AuditEvent` como registro funcional append-only a nivel de aplicación.
- `IdempotencyRecord` para comandos que requieren protección contra reintentos.

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

## Pendiente para cerrar la validación de base de datos

El entorno actual no tiene PostgreSQL ni Docker. La migración fue generada y el schema fue validado offline, pero falta ejecutarla contra una instancia real y cubrir con pruebas e2e:

1. Seed idempotente de instalación y permisos.
2. Creación concurrente del Owner.
3. Reintento con `Idempotency-Key` igual y con payload diferente.
4. Rollback completo ante error transaccional.
5. Lectura de `health/ready` con PostgreSQL disponible.
