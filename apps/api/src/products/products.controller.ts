import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCookieAuth } from '@nestjs/swagger';
import { PermissionCode } from '../auth/authorization/permissions.js';
import { RequirePermissions } from '../auth/authorization/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ListProductsDto } from './dto/list-products.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductsService } from './products.service.js';
import type { ImageUploadFile } from './products.service.js';
import type { AuthenticatedRequest } from '../auth/authorization/authenticated-request.js';
import { requestAuditContext } from '../audit/request-audit-context.js';

@Controller('products')
@UseGuards(SessionAuthGuard, AccountStatusGuard, PermissionsGuard)
@ApiCookieAuth()
@RequirePermissions(PermissionCode.CatalogRead)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: ListProductsDto) {
    return this.productsService.findAll(query, true);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id, true);
  }

  @Post()
  @RequirePermissions(PermissionCode.CatalogManage)
  @HttpCode(HttpStatus.CREATED)
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateProductDto) {
    return this.productsService.create(
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
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(
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
    await this.productsService.remove(
      request.user.companyId,
      request.user.id,
      id,
      requestAuditContext(request),
    );
  }

  @Post(':id/image')
  @RequirePermissions(PermissionCode.CatalogManage)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @HttpCode(HttpStatus.OK)
  uploadImage(@Param('id') id: string, @UploadedFile() file?: ImageUploadFile) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    return this.productsService.uploadImage(id, file);
  }

  @Delete(':id/image')
  @RequirePermissions(PermissionCode.CatalogManage)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteImage(@Param('id') id: string) {
    await this.productsService.deleteImage(id);
  }
}
