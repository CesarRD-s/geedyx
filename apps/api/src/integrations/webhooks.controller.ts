import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authorization/authenticated-request.js';
import { PermissionCode } from '../auth/authorization/permissions.js';
import { RequirePermissions } from '../auth/authorization/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RecentAuthenticationGuard } from '../auth/guards/recent-authentication.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import { requestAuditContext } from '../audit/request-audit-context.js';
import { CreateWebhookEndpointDto } from './dto/create-webhook-endpoint.dto.js';
import { WebhookService } from './webhook.service.js';

@Controller('webhooks')
@UseGuards(
  SessionAuthGuard,
  AccountStatusGuard,
  PermissionsGuard,
  RecentAuthenticationGuard,
)
@RequirePermissions(PermissionCode.CompanyManage)
export class WebhooksController {
  constructor(private readonly service: WebhookService) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.service.findAll(req.user.companyId);
  }

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateWebhookEndpointDto,
  ) {
    return this.service.createEndpoint(
      req.user.companyId,
      req.user.id,
      dto.url,
      dto.eventTypes,
      requestAuditContext(req),
    );
  }
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    await this.service.revokeEndpoint(
      req.user.companyId,
      req.user.id,
      id,
      requestAuditContext(req),
    );
  }
}
