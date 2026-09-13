ALTER TABLE "Company" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE "Company" ADD COLUMN "locale" TEXT,
ADD COLUMN "timeZone" TEXT,
ADD COLUMN "currency" TEXT,
ADD COLUMN "configuredAt" TIMESTAMP(3);

INSERT INTO "Permission" ("id", "code", "description") VALUES ('company_manage', 'company.manage', 'Update company settings') ON CONFLICT ("code") DO NOTHING;
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "Role" r CROSS JOIN "Permission" p
WHERE r."code" IN ('OWNER', 'ADMIN') AND p."code" = 'company.manage'
ON CONFLICT DO NOTHING;
