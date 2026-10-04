import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/auth.types';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { SessionGuard } from '../auth/session.guard';
import { ListAuditDto } from './dto/list-audit.dto';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(SessionGuard, PermissionGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission('audit.read')
  list(@Req() request: AuthenticatedRequest, @Query() dto: ListAuditDto) {
    return this.auditService.list(request.auth!.user.id, dto);
  }
}
