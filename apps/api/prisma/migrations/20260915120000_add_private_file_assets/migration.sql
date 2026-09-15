CREATE TYPE "FileAssetStatus" AS ENUM ('ACTIVE', 'DELETED');

CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "storageProvider" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" "FileAssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Product" ADD COLUMN "imageAssetId" TEXT;

CREATE UNIQUE INDEX "Product_imageAssetId_key" ON "Product"("imageAssetId");
CREATE UNIQUE INDEX "FileAsset_storageProvider_storageKey_key"
  ON "FileAsset"("storageProvider", "storageKey");
CREATE INDEX "FileAsset_companyId_status_createdAt_idx"
  ON "FileAsset"("companyId", "status", "createdAt");
CREATE INDEX "FileAsset_createdByUserId_idx" ON "FileAsset"("createdByUserId");

ALTER TABLE "Product"
  ADD CONSTRAINT "Product_imageAssetId_fkey"
  FOREIGN KEY ("imageAssetId") REFERENCES "FileAsset"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FileAsset"
  ADD CONSTRAINT "FileAsset_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FileAsset"
  ADD CONSTRAINT "FileAsset_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
