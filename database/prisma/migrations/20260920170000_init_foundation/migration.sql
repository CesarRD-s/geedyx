-- Geedyx foundation: installation, company, identity minimum and audit boundary.

CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "InstallationStatus" AS ENUM (
    'PENDING',
    'COMPLETED'
);

CREATE TYPE "UserStatus" AS ENUM (
    'ACTIVE',
    'DISABLED',
    'LOCKED'
);

CREATE TYPE "AuditOutcome" AS ENUM (
    'SUCCESS',
    'FAILURE'
);

CREATE TABLE "Installation" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "status" "InstallationStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "companyId" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Installation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "timeZone" TEXT,
    "currency" TEXT,
    "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "timeFormat" TEXT NOT NULL DEFAULT '24',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId", "roleId")
);

CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "actorUserId" TEXT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "outcome" "AuditOutcome" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "requestId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseStatus" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Installation_key_key"
    ON "Installation"("key");

CREATE UNIQUE INDEX "Installation_companyId_key"
    ON "Installation"("companyId");

CREATE UNIQUE INDEX "Installation_ownerId_key"
    ON "Installation"("ownerId");

CREATE UNIQUE INDEX "User_email_key"
    ON "User"("email");

CREATE UNIQUE INDEX "Role_companyId_code_key"
    ON "Role"("companyId", "code");

CREATE UNIQUE INDEX "Permission_code_key"
    ON "Permission"("code");

CREATE INDEX "AuditEvent_companyId_occurredAt_idx"
    ON "AuditEvent"("companyId", "occurredAt");

CREATE INDEX "AuditEvent_module_action_occurredAt_idx"
    ON "AuditEvent"("module", "action", "occurredAt");

CREATE UNIQUE INDEX "IdempotencyRecord_operation_key_key"
    ON "IdempotencyRecord"("operation", "key");

ALTER TABLE "Installation"
    ADD CONSTRAINT "Installation_companyId_fkey"
    FOREIGN KEY ("companyId")
    REFERENCES "Company"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE "Installation"
    ADD CONSTRAINT "Installation_ownerId_fkey"
    FOREIGN KEY ("ownerId")
    REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE "User"
    ADD CONSTRAINT "User_companyId_fkey"
    FOREIGN KEY ("companyId")
    REFERENCES "Company"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "Role"
    ADD CONSTRAINT "Role_companyId_fkey"
    FOREIGN KEY ("companyId")
    REFERENCES "Company"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "UserRole"
    ADD CONSTRAINT "UserRole_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "UserRole"
    ADD CONSTRAINT "UserRole_roleId_fkey"
    FOREIGN KEY ("roleId")
    REFERENCES "Role"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "RolePermission"
    ADD CONSTRAINT "RolePermission_roleId_fkey"
    FOREIGN KEY ("roleId")
    REFERENCES "Role"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "RolePermission"
    ADD CONSTRAINT "RolePermission_permissionId_fkey"
    FOREIGN KEY ("permissionId")
    REFERENCES "Permission"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "AuditEvent"
    ADD CONSTRAINT "AuditEvent_companyId_fkey"
    FOREIGN KEY ("companyId")
    REFERENCES "Company"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE "AuditEvent"
    ADD CONSTRAINT "AuditEvent_actorUserId_fkey"
    FOREIGN KEY ("actorUserId")
    REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
