-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'es',
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "timeZone" TEXT NOT NULL DEFAULT 'UTC';

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateIndex
CREATE INDEX "Role_companyId_idx" ON "Role"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_companyId_code_key" ON "Role"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Permission codes are stable application capabilities. They are created by
-- migration so a new installation can assign the owner role atomically.
INSERT INTO "Permission" ("id", "code", "description") VALUES
  ('permission-catalog-read', 'catalog.read', 'Read products and categories'),
  ('permission-catalog-manage', 'catalog.manage', 'Create, update and remove products and categories'),
  ('permission-users-read', 'users.read', 'Read internal users and available roles'),
  ('permission-users-manage', 'users.manage', 'Create users, suspend accounts and assign roles');

-- Every existing company receives the same explicit system-role vocabulary.
INSERT INTO "Role" ("id", "companyId", "code", "name", "description", "isSystem", "createdAt", "updatedAt")
SELECT "id" || '-role-owner', "id", 'OWNER', 'Propietario', 'Acceso total e inmutable a la empresa', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Company"
UNION ALL
SELECT "id" || '-role-admin', "id", 'ADMIN', 'Administrador', 'Gestiona catálogo y usuarios internos', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Company"
UNION ALL
SELECT "id" || '-role-catalog-manager', "id", 'CATALOG_MANAGER', 'Gestor de catálogo', 'Gestiona productos y categorías', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Company"
UNION ALL
SELECT "id" || '-role-viewer', "id", 'VIEWER', 'Consulta', 'Consulta el catálogo interno', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Company";

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT "id", 'permission-catalog-read' FROM "Role" WHERE "code" IN ('OWNER', 'ADMIN', 'CATALOG_MANAGER', 'VIEWER')
UNION ALL
SELECT "id", 'permission-catalog-manage' FROM "Role" WHERE "code" IN ('OWNER', 'ADMIN', 'CATALOG_MANAGER')
UNION ALL
SELECT "id", 'permission-users-read' FROM "Role" WHERE "code" IN ('OWNER', 'ADMIN')
UNION ALL
SELECT "id", 'permission-users-manage' FROM "Role" WHERE "code" IN ('OWNER', 'ADMIN');

-- The original installation owner keeps complete access. Additional legacy
-- users retain read-only catalog access until an administrator assigns roles.
INSERT INTO "UserRole" ("userId", "roleId")
SELECT "ownerId", "companyId" || '-role-owner' FROM "Installation";

INSERT INTO "UserRole" ("userId", "roleId")
SELECT u."id", u."companyId" || '-role-viewer'
FROM "User" u
LEFT JOIN "Installation" i ON i."ownerId" = u."id"
WHERE i."ownerId" IS NULL;
