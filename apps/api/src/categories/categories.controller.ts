import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { ApiCookieAuth } from '@nestjs/swagger';
import { PermissionCode } from '../auth/authorization/permissions.js';
import { RequirePermissions } from '../auth/authorization/require-permissions.decorator.js';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import type { AuthenticatedRequest } from '../auth/authorization/authenticated-request.js';
import { requestAuditContext } from '../audit/request-audit-context.js';

@Controller('categories')
@UseGuards(SessionAuthGuard, AccountStatusGuard, PermissionsGuard)
@ApiCookieAuth()
@RequirePermissions(PermissionCode.CatalogRead)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @RequirePermissions(PermissionCode.CatalogManage)
  @HttpCode(HttpStatus.CREATED)
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(
      request.user.companyId,
      request.user.id,
      dto,
      requestAuditContext(request),
    );
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.CatalogManage)
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(
      request.user.companyId,
      request.user.id,
      id,
      dto,
      requestAuditContext(request),
    );
  }

  @Delete(':id')
  @RequirePermissions(PermissionCode.CatalogManage)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    await this.categoriesService.remove(
      request.user.companyId,
      request.user.id,
      id,
      requestAuditContext(request),
    );
  }
}
