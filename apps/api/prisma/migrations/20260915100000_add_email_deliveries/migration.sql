CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'SUPPRESSED');
CREATE TYPE "EmailTemplate" AS ENUM ('PASSWORD_RESET', 'USER_INVITATION', 'EMAIL_CHANGE_VERIFICATION');

CREATE TABLE "EmailDelivery" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "template" "EmailTemplate" NOT NULL,
    "recipientHash" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "providerMessageId" TEXT,
    "lastErrorCode" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailDelivery_companyId_createdAt_idx" ON "EmailDelivery"("companyId", "createdAt");
CREATE INDEX "EmailDelivery_template_status_createdAt_idx" ON "EmailDelivery"("template", "status", "createdAt");

ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
