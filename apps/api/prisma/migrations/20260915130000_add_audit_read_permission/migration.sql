INSERT INTO "Permission" ("id", "code", "name", "description", "createdAt", "updatedAt")
VALUES ('permission-audit-read', 'audit.read', 'Ver auditoría', 'Consulta el registro de auditoría', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."code" = 'audit.read'
WHERE r."code" IN ('OWNER', 'ADMIN')
ON CONFLICT DO NOTHING;
