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
import { ApiCookieAuth } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authorization/authenticated-request.js';
import { PermissionCode } from '../auth/authorization/permissions.js';
import { RequirePermissions } from '../auth/authorization/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RecentAuthenticationGuard } from '../auth/guards/recent-authentication.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import { requestAuditContext } from '../audit/request-audit-context.js';
import { CreateIntegrationClientDto } from './dto/create-integration-client.dto.js';
import { IntegrationsService } from './integrations.service.js';

@Controller('integrations')
@UseGuards(
  SessionAuthGuard,
  AccountStatusGuard,
  PermissionsGuard,
  RecentAuthenticationGuard,
)
@ApiCookieAuth()
@RequirePermissions(PermissionCode.CompanyManage)
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Get() findAll(@Req() req: AuthenticatedRequest) {
    return this.service.findAll(req.user.companyId);
  }
  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateIntegrationClientDto,
  ) {
    return this.service.create(
      req.user.companyId,
      req.user.id,
      dto,
      requestAuditContext(req),
    );
  }
  @Post(':id/rotate')
  rotate(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.service.rotate(
      req.user.companyId,
      req.user.id,
      id,
      requestAuditContext(req),
    );
  }
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    await this.service.revoke(
      req.user.companyId,
      req.user.id,
      id,
      requestAuditContext(req),
    );
  }
}
