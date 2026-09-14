import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { IntegrationsController } from './integrations.controller.js';
import { IntegrationsService } from './integrations.service.js';
import { IntegrationAuthService } from './integration-auth.service.js';
import { IdempotencyService } from './idempotency.service.js';
import { WebhookCryptoService } from './webhook-crypto.service.js';
import { WebhookService } from './webhook.service.js';
import { InboundWebhookService } from './inbound-webhook.service.js';
import { WebhooksController } from './webhooks.controller.js';
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [IntegrationsController, WebhooksController],
  providers: [
    IntegrationsService,
    IntegrationAuthService,
    IdempotencyService,
    WebhookCryptoService,
    WebhookService,
    InboundWebhookService,
  ],
  exports: [
    IntegrationAuthService,
    IdempotencyService,
    WebhookCryptoService,
    WebhookService,
    InboundWebhookService,
  ],
})
export class IntegrationsModule {}
