ALTER TABLE "Session" ADD COLUMN "reauthenticatedAt" TIMESTAMP(3);

UPDATE "Session"
SET "reauthenticatedAt" = "createdAt";

ALTER TABLE "Session" ALTER COLUMN "reauthenticatedAt" SET NOT NULL;
