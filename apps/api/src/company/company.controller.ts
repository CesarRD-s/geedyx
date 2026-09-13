import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authorization/authenticated-request.js';
import { PermissionCode } from '../auth/authorization/permissions.js';
import { RequirePermissions } from '../auth/authorization/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RecentAuthenticationGuard } from '../auth/guards/recent-authentication.guard.js';
import { CompanyService } from './company.service.js';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto.js';

@Controller('company')
@UseGuards(SessionAuthGuard, AccountStatusGuard)
@ApiCookieAuth()
export class CompanyController {
  constructor(private readonly service: CompanyService) {}
  @Get('settings') get(@Req() req: AuthenticatedRequest) {
    return this.service.get(req.user.companyId);
  }
  @Patch('settings')
  @UseGuards(PermissionsGuard, RecentAuthenticationGuard)
  @RequirePermissions(PermissionCode.CompanyManage)
  update(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateCompanySettingsDto,
  ) {
    return this.service.update(req.user.companyId, dto);
  }
}
