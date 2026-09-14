CREATE TABLE "WebhookEndpoint" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secretCiphertext" BYTEA NOT NULL,
  "secretNonce" BYTEA NOT NULL,
  "secretAuthTag" BYTEA NOT NULL,
  "encryptionKeyVersion" INTEGER NOT NULL DEFAULT 1,
  "eventTypes" TEXT[] NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WebhookDelivery" (
  "id" TEXT NOT NULL,
  "webhookEndpointId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "deliveredAt" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WebhookEndpoint_companyId_revokedAt_idx"
ON "WebhookEndpoint"("companyId", "revokedAt");
CREATE UNIQUE INDEX "WebhookDelivery_webhookEndpointId_eventId_key"
ON "WebhookDelivery"("webhookEndpointId", "eventId");
CREATE INDEX "WebhookDelivery_nextAttemptAt_idx"
ON "WebhookDelivery"("nextAttemptAt");
ALTER TABLE "WebhookEndpoint"
ADD CONSTRAINT "WebhookEndpoint_companyId_fkey"
FOREIGN KEY ("companyId")
REFERENCES "Company"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
ALTER TABLE "WebhookDelivery"
ADD CONSTRAINT "WebhookDelivery_webhookEndpointId_fkey"
FOREIGN KEY ("webhookEndpointId")
REFERENCES "WebhookEndpoint"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
CREATE TABLE "InboundWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "InboundWebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InboundWebhookEvent_provider_eventId_key"
ON "InboundWebhookEvent"("provider", "eventId");
CREATE INDEX "InboundWebhookEvent_receivedAt_idx"
ON "InboundWebhookEvent"("receivedAt");
