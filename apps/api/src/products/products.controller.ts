import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { assertCsrf, CSRF_HEADER } from '../auth/csrf';
import { AuthenticatedRequest } from '../auth/auth.types';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { SessionGuard } from '../auth/session.guard';
import type { RequestWithId } from '../http/request-id.middleware';
import { PaginationDto } from '../http/pagination.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(SessionGuard, PermissionGuard)
export class ProductsController {
  constructor(
    private readonly authService: AuthService,
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  @RequirePermission('products.read')
  listProducts(@Req() request: AuthenticatedRequest, @Query() dto: PaginationDto) {
    return this.productsService.listProducts(request.auth!.user.id, dto);
  }

  @Get('categories')
  @RequirePermission('products.read')
  listCategories(@Req() request: AuthenticatedRequest, @Query() dto: PaginationDto) {
    return this.productsService.listCategories(request.auth!.user.id, dto);
  }

  @Post('categories')
  @RequirePermission('products.manage')
  createCategory(
    @Body() dto: CreateCategoryDto,
    @Headers(CSRF_HEADER) csrfHeader: string | undefined,
    @Req() request: AuthenticatedRequest & RequestWithId & Request,
  ) {
    assertCsrf(request, csrfHeader, this.authService.getCsrfCookieName());
    return this.productsService.createCategory(
      request.auth!.user.id,
      dto,
      request.requestId,
    );
  }

  @Post()
  @RequirePermission('products.manage')
  createProduct(
    @Body() dto: CreateProductDto,
    @Headers(CSRF_HEADER) csrfHeader: string | undefined,
    @Req() request: AuthenticatedRequest & RequestWithId & Request,
  ) {
    assertCsrf(request, csrfHeader, this.authService.getCsrfCookieName());
    return this.productsService.createProduct(
      request.auth!.user.id,
      dto,
      request.requestId,
    );
  }

  @Patch(':productId')
  @RequirePermission('products.manage')
  updateProduct(
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
    @Headers(CSRF_HEADER) csrfHeader: string | undefined,
    @Req() request: AuthenticatedRequest & RequestWithId & Request,
  ) {
    assertCsrf(request, csrfHeader, this.authService.getCsrfCookieName());
    return this.productsService.updateProduct(
      request.auth!.user.id,
      productId,
      dto,
      request.requestId,
    );
  }
}
