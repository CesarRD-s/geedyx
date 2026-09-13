CREATE TYPE "AuditActorType" AS ENUM (
  'ANONYMOUS',
  'INTERNAL_USER',
  'SYSTEM',
  'INTEGRATION_CLIENT'
);

CREATE TYPE "AuditOutcome" AS ENUM ('SUCCEEDED', 'FAILED', 'DENIED');

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL,
  "sequence" BIGSERIAL NOT NULL,
  "companyId" TEXT,
  "actorType" "AuditActorType" NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "outcome" "AuditOutcome" NOT NULL,
  "targetType" TEXT,
  "targetId" TEXT,
  "requestId" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuditEvent_sequence_key" ON "AuditEvent"("sequence");
CREATE INDEX "AuditEvent_companyId_occurredAt_idx"
  ON "AuditEvent"("companyId", "occurredAt");
CREATE INDEX "AuditEvent_actorType_actorId_occurredAt_idx"
  ON "AuditEvent"("actorType", "actorId", "occurredAt");
CREATE INDEX "AuditEvent_action_outcome_occurredAt_idx"
  ON "AuditEvent"("action", "outcome", "occurredAt");
CREATE INDEX "AuditEvent_targetType_targetId_occurredAt_idx"
  ON "AuditEvent"("targetType", "targetId", "occurredAt");
CREATE INDEX "AuditEvent_requestId_idx" ON "AuditEvent"("requestId");

ALTER TABLE "AuditEvent"
  ADD CONSTRAINT "AuditEvent_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "prevent_audit_event_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent is append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "AuditEvent_append_only"
BEFORE UPDATE OR DELETE OR TRUNCATE ON "AuditEvent"
FOR EACH STATEMENT
EXECUTE FUNCTION "prevent_audit_event_mutation"();
