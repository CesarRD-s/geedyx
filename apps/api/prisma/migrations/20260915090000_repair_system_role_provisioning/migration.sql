-- Earlier installations created after the role migration received only OWNER.
-- Complete the system vocabulary for every company without changing existing
-- role names, descriptions or custom assignments.
INSERT INTO "Role" ("id", "companyId", "code", "name", "description", "isSystem", "createdAt", "updatedAt")
SELECT "id" || '-role-owner', "id", 'OWNER', 'Propietario', 'Acceso total e inmutable a la empresa', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Company"
UNION ALL
SELECT "id" || '-role-admin', "id", 'ADMIN', 'Administrador', 'Gestiona la configuración, el catálogo y los usuarios internos', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Company"
UNION ALL
SELECT "id" || '-role-catalog-manager', "id", 'CATALOG_MANAGER', 'Gestor de catálogo', 'Gestiona productos y categorías', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Company"
UNION ALL
SELECT "id" || '-role-viewer', "id", 'VIEWER', 'Consulta', 'Consulta el catálogo interno', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Company"
ON CONFLICT ("companyId", "code") DO NOTHING;

-- Restore every system role's capability set. Existing assignments remain.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."code" IN ('OWNER', 'ADMIN')
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."code" IN ('catalog.read', 'catalog.manage')
WHERE r."code" = 'CATALOG_MANAGER'
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."code" = 'catalog.read'
WHERE r."code" = 'VIEWER'
ON CONFLICT DO NOTHING;
