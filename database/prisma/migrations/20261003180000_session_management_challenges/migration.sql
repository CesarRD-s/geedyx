-- CreateTable
CREATE TABLE "SessionManagementChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionManagementChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionManagementChallenge_tokenHash_key" ON "SessionManagementChallenge"("tokenHash");

-- CreateIndex
CREATE INDEX "SessionManagementChallenge_userId_expiresAt_idx" ON "SessionManagementChallenge"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "SessionManagementChallenge" ADD CONSTRAINT "SessionManagementChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
