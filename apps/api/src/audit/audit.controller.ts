import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authorization/authenticated-request.js';
import { PermissionCode } from '../auth/authorization/permissions.js';
import { RequirePermissions } from '../auth/authorization/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import { ListAuditEventsDto } from './dto/list-audit-events.dto.js';
import { AuditService } from './audit.service.js';

@Controller('audit-events')
@UseGuards(SessionAuthGuard, AccountStatusGuard, PermissionsGuard)
@ApiCookieAuth()
@RequirePermissions(PermissionCode.AuditRead)
export class AuditController {
  constructor(private readonly audit: AuditService) {}
  @Get()
  findAll(@Req() request: AuthenticatedRequest, @Query() query: ListAuditEventsDto) {
    return this.audit.findAll(request.user.companyId, query);
  }
}
