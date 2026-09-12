-- AlterTable
ALTER TABLE "User" ADD COLUMN "companyId" TEXT;

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- Existing local installations predate the company model. Preserve their users
-- by attaching them to one explicitly marked legacy company.
INSERT INTO "Company" ("id", "name", "createdAt", "updatedAt")
SELECT 'legacy-company', 'Empresa migrada', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "User");

UPDATE "User"
SET "companyId" = 'legacy-company'
WHERE "companyId" IS NULL;

ALTER TABLE "User" ALTER COLUMN "companyId" SET NOT NULL;

-- CreateTable
CREATE TABLE "Installation" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Installation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Installation_companyId_key" ON "Installation"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Installation_ownerId_key" ON "Installation"("ownerId");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- AddForeignKey
ALTER TABLE "Installation" ADD CONSTRAINT "Installation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installation" ADD CONSTRAINT "Installation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A pre-existing user means setup was already completed before this model
-- existed. Record that fact so bootstrap cannot reopen after migration.
INSERT INTO "Installation" ("id", "companyId", "ownerId")
SELECT 'singleton', 'legacy-company', "id"
FROM "User"
ORDER BY "createdAt", "id"
LIMIT 1;
