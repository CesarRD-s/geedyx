CREATE TYPE "MfaFactorType" AS ENUM ('TOTP');

CREATE TABLE "MfaFactor" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "MfaFactorType" NOT NULL DEFAULT 'TOTP',
  "label" TEXT,
  "secretCiphertext" BYTEA NOT NULL,
  "secretNonce" BYTEA NOT NULL,
  "secretAuthTag" BYTEA NOT NULL,
  "encryptionKeyVersion" INTEGER NOT NULL DEFAULT 1,
  "totpAlgorithm" TEXT NOT NULL DEFAULT 'SHA1',
  "totpDigits" INTEGER NOT NULL DEFAULT 6,
  "totpPeriodSeconds" INTEGER NOT NULL DEFAULT 30,
  "lastUsedStep" BIGINT,
  "verifiedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MfaFactor_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MfaFactor_encryption_key_version_check"
    CHECK ("encryptionKeyVersion" > 0),
  CONSTRAINT "MfaFactor_secret_nonce_length_check"
    CHECK (octet_length("secretNonce") = 12),
  CONSTRAINT "MfaFactor_secret_auth_tag_length_check"
    CHECK (octet_length("secretAuthTag") = 16),
  CONSTRAINT "MfaFactor_totp_algorithm_check"
    CHECK ("totpAlgorithm" IN ('SHA1', 'SHA256', 'SHA512')),
  CONSTRAINT "MfaFactor_totp_digits_check"
    CHECK ("totpDigits" IN (6, 8)),
  CONSTRAINT "MfaFactor_totp_period_check"
    CHECK ("totpPeriodSeconds" BETWEEN 15 AND 120)
);

CREATE TABLE "MfaRecoveryCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MfaRecoveryCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MfaFactor_userId_revokedAt_idx"
  ON "MfaFactor"("userId", "revokedAt");
CREATE INDEX "MfaFactor_userId_verifiedAt_idx"
  ON "MfaFactor"("userId", "verifiedAt");
CREATE UNIQUE INDEX "MfaRecoveryCode_codeHash_key"
  ON "MfaRecoveryCode"("codeHash");
CREATE INDEX "MfaRecoveryCode_userId_usedAt_revokedAt_idx"
  ON "MfaRecoveryCode"("userId", "usedAt", "revokedAt");

ALTER TABLE "MfaFactor"
  ADD CONSTRAINT "MfaFactor_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MfaRecoveryCode"
  ADD CONSTRAINT "MfaRecoveryCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
