import { Body, Controller, Get, Headers, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { assertCsrf, CSRF_HEADER } from '../auth/csrf';
import { AuthenticatedRequest } from '../auth/auth.types';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { SessionGuard } from '../auth/session.guard';
import type { RequestWithId } from '../http/request-id.middleware';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { ConfigurationService } from './configuration.service';

@Controller('configuration')
@UseGuards(SessionGuard, PermissionGuard)
export class ConfigurationController {
  constructor(
    private readonly authService: AuthService,
    private readonly configurationService: ConfigurationService,
  ) {}

  @Get()
  @RequirePermission('configuration.read')
  getConfiguration(@Req() request: AuthenticatedRequest) {
    return this.configurationService.getConfiguration(request.auth!.user.id);
  }

  @Patch()
  @RequirePermission('configuration.update')
  updateConfiguration(
    @Body() dto: UpdateConfigurationDto,
    @Headers(CSRF_HEADER) csrfHeader: string | undefined,
    @Req() request: AuthenticatedRequest & RequestWithId & Request,
  ) {
    assertCsrf(request, csrfHeader, this.authService.getCsrfCookieName());
    return this.configurationService.updateConfiguration(
      request.auth!.user.id,
      dto,
      request.requestId,
    );
  }
}
