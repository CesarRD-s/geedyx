ALTER TABLE "Role"
ADD COLUMN "description" TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX "Role_companyId_name_key"
ON "Role"("companyId", "name");

UPDATE "Role"
SET
  "name" = CASE "code"
    WHEN 'OWNER' THEN 'Propietario de la empresa'
    WHEN 'ADMIN' THEN 'Administrador'
    WHEN 'USER' THEN 'Usuario de consulta'
    ELSE "name"
  END,
  "description" = CASE "code"
    WHEN 'OWNER' THEN 'Administra la empresa, sus accesos y todas las operaciones disponibles.'
    WHEN 'ADMIN' THEN 'Administra las cuentas, la configuración y las operaciones de la empresa.'
    WHEN 'USER' THEN 'Consulta la información disponible para las tareas de su puesto.'
    ELSE "description"
  END
WHERE "isSystem" = TRUE;

DELETE FROM "RolePermission" AS role_permission
USING "Permission" AS permission
WHERE role_permission."permissionId" = permission."id"
  AND permission."code" NOT IN (
    'dashboard.read',
    'configuration.read',
    'configuration.update',
    'users.read',
    'users.manage',
    'roles.manage',
    'sessions.read',
    'sessions.revoke',
    'products.read',
    'products.manage',
    'audit.read'
  );
