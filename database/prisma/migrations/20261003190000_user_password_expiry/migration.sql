-- Add temporary password expiry for managed users.
ALTER TABLE "User"
ADD COLUMN "passwordExpiresAt" TIMESTAMP(3);
