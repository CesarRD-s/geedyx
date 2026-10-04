import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CategoriesResponse,
  CategorySummary,
  ProductSummary,
  ProductsResponse,
} from '@geedyx/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { paginationMeta, PaginationDto } from '../http/pagination.dto';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';

const PRODUCT_INCLUDE = {
  category: {
    select: {
      id: true,
      name: true,
    },
  },
  variants: {
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof PRODUCT_INCLUDE;
}>;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(
    actorUserId: string,
    dto: PaginationDto = new PaginationDto(),
  ): Promise<CategoriesResponse> {
    const companyId = await this.companyIdFor(actorUserId);
    const [categories, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where: { companyId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: dto.skip,
        take: dto.take,
      }),
      this.prisma.category.count({ where: { companyId } }),
    ]);
    return {
      categories: categories.map((category) => this.toCategory(category)),
      pagination: paginationMeta(dto.page, dto.pageSize, total),
    };
  }

  async createCategory(
    actorUserId: string,
    dto: CreateCategoryDto,
    requestId: string | undefined,
  ): Promise<CategorySummary> {
    const companyId = await this.companyIdFor(actorUserId);
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, companyId, archivedAt: null },
      });
      if (!parent) {
        throw new NotFoundException({
          code: 'CATEGORY_PARENT_NOT_FOUND',
          detail: 'La categoría padre no existe.',
        });
      }
    }

    try {
      const category = await this.prisma.$transaction(async (tx) => {
        const created = await tx.category.create({
          data: {
            companyId,
            name: dto.name.trim(),
            parentId: dto.parentId,
            sortOrder: dto.sortOrder ?? 0,
          },
        });
        await tx.auditEvent.create({
          data: {
            companyId,
            actorUserId,
            module: 'products',
            action: 'CATEGORY_CREATED',
            outcome: 'SUCCESS',
            entityType: 'Category',
            entityId: created.id,
            requestId,
          },
        });
        return created;
      });
      return this.toCategory(category);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'CATEGORY_ALREADY_EXISTS',
          detail: 'Ya existe una categoría con ese nombre.',
        });
      }
      throw error;
    }
  }

  async listProducts(
    actorUserId: string,
    dto: PaginationDto = new PaginationDto(),
  ): Promise<ProductsResponse> {
    const companyId = await this.companyIdFor(actorUserId);
    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: { companyId },
        include: PRODUCT_INCLUDE,
        orderBy: [{ status: 'asc' }, { title: 'asc' }],
        skip: dto.skip,
        take: dto.take,
      }),
      this.prisma.product.count({ where: { companyId } }),
    ]);
    return {
      products: products.map((product) => this.toProduct(product)),
      pagination: paginationMeta(dto.page, dto.pageSize, total),
    };
  }

  async createProduct(
    actorUserId: string,
    dto: CreateProductDto,
    requestId: string | undefined,
  ): Promise<ProductSummary> {
    const companyId = await this.companyIdFor(actorUserId);
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, companyId, archivedAt: null },
      });
      if (!category) {
        throw new NotFoundException({
          code: 'PRODUCT_CATEGORY_NOT_FOUND',
          detail: 'La categoría seleccionada no existe.',
        });
      }
    }

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: {
            companyId,
            categoryId: dto.categoryId,
            title: dto.title.trim(),
            shortDescription: this.clean(dto.shortDescription),
            description: this.clean(dto.description),
            brand: this.clean(dto.brand),
            model: this.clean(dto.model),
            variants: {
              create: {
                sku: dto.sku.trim(),
                barcode: this.clean(dto.barcode),
                priceCents: dto.priceCents,
              },
            },
          },
          include: PRODUCT_INCLUDE,
        });
        await tx.auditEvent.create({
          data: {
            companyId,
            actorUserId,
            module: 'products',
            action: 'PRODUCT_CREATED',
            outcome: 'SUCCESS',
            entityType: 'Product',
            entityId: created.id,
            requestId,
            metadata: {
              sku: dto.sku.trim(),
            },
          },
        });
        return created;
      });
      return this.toProduct(product);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2003')
      ) {
        throw new ConflictException({
          code: 'PRODUCT_IDENTIFIER_ALREADY_EXISTS',
          detail: 'El SKU o código de barras ya está registrado.',
        });
      }
      throw error;
    }
  }

  async updateProduct(
    actorUserId: string,
    productId: string,
    dto: UpdateProductDto,
    requestId: string | undefined,
  ): Promise<ProductSummary> {
    const companyId = await this.companyIdFor(actorUserId);
    const current = await this.prisma.product.findFirst({
      where: { id: productId, companyId },
      include: PRODUCT_INCLUDE,
    });
    if (!current) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        detail: 'El producto no existe.',
      });
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, companyId, archivedAt: null },
      });
      if (!category) {
        throw new NotFoundException({
          code: 'PRODUCT_CATEGORY_NOT_FOUND',
          detail: 'La categoría seleccionada no existe.',
        });
      }
    }

    const variantData = {
      ...(dto.sku !== undefined ? { sku: dto.sku.trim() } : {}),
      ...(dto.barcode !== undefined ? { barcode: this.clean(dto.barcode) } : {}),
    };

    const product = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
          ...(dto.shortDescription !== undefined
            ? { shortDescription: this.clean(dto.shortDescription) }
            : {}),
          ...(dto.description !== undefined
            ? { description: this.clean(dto.description) }
            : {}),
          ...(dto.brand !== undefined ? { brand: this.clean(dto.brand) } : {}),
          ...(dto.model !== undefined ? { model: this.clean(dto.model) } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.visibility !== undefined ? { visibility: dto.visibility } : {}),
          ...(Object.keys(variantData).length > 0
            ? { variants: { updateMany: { data: variantData, where: {} } } }
            : {}),
        },
        include: PRODUCT_INCLUDE,
      });
      await tx.auditEvent.create({
        data: {
          companyId,
          actorUserId,
          module: 'products',
          action: dto.status === 'ARCHIVED' ? 'PRODUCT_ARCHIVED' : 'PRODUCT_UPDATED',
          outcome: 'SUCCESS',
          entityType: 'Product',
          entityId: productId,
          requestId,
          metadata: {
            fields: Object.keys(dto),
          },
        },
      });
      return updated;
    });
    return this.toProduct(product);
  }

  private async companyIdFor(actorUserId: string): Promise<string> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { companyId: true },
    });
    if (!actor) {
      throw new NotFoundException({
        code: 'ACTOR_NOT_FOUND',
        detail: 'No se encontró el usuario de la sesión.',
      });
    }
    return actor.companyId;
  }

  private clean(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  private toCategory(category: {
    id: string;
    name: string;
    parentId: string | null;
    sortOrder: number;
    archivedAt: Date | null;
  }): CategorySummary {
    return {
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      sortOrder: category.sortOrder,
      archivedAt: category.archivedAt?.toISOString() ?? null,
    };
  }

  private toProduct(product: ProductWithRelations): ProductSummary {
    return {
      id: product.id,
      title: product.title,
      categoryId: product.categoryId,
      categoryName: product.category?.name ?? null,
      status: product.status,
      visibility: product.visibility,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        barcode: variant.barcode,
        priceCents: variant.priceCents,
        status: variant.status,
      })),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }
}
