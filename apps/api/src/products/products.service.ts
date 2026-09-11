import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeName, slugify } from '../categories/slug.js';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  detectImageFormat,
  IMAGE_FORMAT_EXTENSION,
} from '../images/image-formats.js';
import { IMAGE_STORAGE } from '../images/image-storage.js';
import {
  asImageUploadConfig,
  getMaxImageBytes,
} from '../images/image-upload-options.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ImageStorage } from '../images/image-storage.js';
import type { Prisma } from '../generated/prisma/client.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ListProductsDto } from './dto/list-products.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

const PRODUCT_LIST_SELECT = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  price: true,
  stock: true,
  lowStockThreshold: true,
  imageUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true } },
} as const;

const PRODUCT_DETAIL_SELECT = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  description: true,
  price: true,
  stock: true,
  lowStockThreshold: true,
  imageUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true } },
} as const;

type ProductListItemRow = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_LIST_SELECT;
}>;

type ProductDetailRow = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_DETAIL_SELECT;
}>;

export interface ProductCategoryRef {
  id: string;
  name: string;
  slug: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: ProductCategoryRef;
}

export interface ProductDetail extends ProductListItem {
  description: string | null;
  lowStockThreshold: number;
  imageUrl: string | null;
}

export interface ProductListResult {
  data: ProductListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ImageUploadFile {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
}

const DEFAULT_STOCK = 0;
const DEFAULT_LOW_STOCK_THRESHOLD = 5;
const DEFAULT_IS_ACTIVE = true;
const MAX_SLUG_ATTEMPTS = 10_000;

const UNIQUE_VIOLATION = 'P2002';

function isPrismaError(
  error: unknown,
  ...codes: string[]
): error is { code: string } {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && codes.includes(code);
}

function uniqueViolationTarget(error: unknown): string[] {
  if (typeof error !== 'object' || error === null) {
    return [];
  }
  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  if (!Array.isArray(target)) {
    return [];
  }
  return target.filter((t): t is string => typeof t === 'string');
}

function normalizeSku(sku: string): string {
  return sku.trim().replace(/\s+/g, ' ');
}

function trimmedOrNull(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * The column is NUMERIC(10, 2). maxDecimalPlaces:2 validation guarantees at
 * most two decimals, so converting back to a fixed two-decimal string is exact
 * and avoids binary floating-point drift during persistence.
 */
function toDecimalInput(price: number): string {
  return price.toFixed(2);
}

function productSlug(name: string): string {
  const slug = slugify(normalizeName(name));
  if (!slug) {
    throw new BadRequestException(
      'Product name must produce a URL-friendly slug',
    );
  }
  return slug;
}

function hasNoUpdatableFields(dto: UpdateProductDto): boolean {
  return (
    dto.name === undefined &&
    dto.sku === undefined &&
    dto.description === undefined &&
    dto.price === undefined &&
    dto.stock === undefined &&
    dto.lowStockThreshold === undefined &&
    dto.categoryId === undefined &&
    dto.isActive === undefined
  );
}

function toListItem(row: ProductListItemRow): ProductListItem {
  return { ...row, price: row.price.toNumber() };
}

function toDetail(row: ProductDetailRow): ProductDetail {
  return { ...row, price: row.price.toNumber() };
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private readonly maxImageBytes: number;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(IMAGE_STORAGE) private readonly images: ImageStorage,
    config: ConfigService,
  ) {
    this.maxImageBytes = getMaxImageBytes(asImageUploadConfig(config));
  }

  async uploadImage(id: string, file: ImageUploadFile): Promise<ProductDetail> {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, imageUrl: true },
    });
    if (!existing) {
      throw new NotFoundException('Product not found');
    }
    this.validateImageFile(file);

    // 1. Persist the new file first so the previous image stays available if
    //    anything below fails.
    let newImageUrl: string;
    try {
      newImageUrl = await this.images.save(file.buffer, this.imageExtension(file.buffer));
    } catch (error) {
      this.logger.error(`Failed to store image for product ${id}`, error);
      throw new InternalServerErrorException('Could not store the image');
    }

    const updated = await this.prisma.product
      .update({
        where: { id },
        data: { imageUrl: newImageUrl },
        select: PRODUCT_DETAIL_SELECT,
      })
      .catch((error) => {
        // 2. The DB update failed after the new file was written: clean the new
        //    file up so it does not become orphaned.
        this.images.delete(newImageUrl).catch((cleanupError) => {
          this.logger.error(`Failed to clean up image ${newImageUrl}`, cleanupError);
        });
        throw error;
      });

    // 3. DB updated: remove the previous image. A failure here is logged, not
    //    thrown, so it never reverts the product or fails the request.
    if (existing.imageUrl !== null) {
      await this.images.delete(existing.imageUrl).catch((error) => {
        this.logger.error(`Failed to delete old image ${existing.imageUrl}`, error);
      });
    }

    return toDetail(updated);
  }

  async deleteImage(id: string): Promise<void> {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, imageUrl: true },
    });
    if (!existing) {
      throw new NotFoundException('Product not found');
    }
    if (existing.imageUrl === null) {
      // Idempotent: a product without an image is already in the desired state.
      return;
    }

    await this.images.delete(existing.imageUrl).catch((error) => {
      this.logger.error(`Failed to delete image ${existing.imageUrl}`, error);
    });

    await this.prisma.product.update({
      where: { id },
      data: { imageUrl: null },
      select: { id: true },
    });
  }

  private validateImageFile(file: ImageUploadFile): void {
    if (file.size > this.maxImageBytes) {
      throw new PayloadTooLargeException(
        `Image exceeds the ${Math.floor(this.maxImageBytes / 1024 / 1024)} MB limit`,
      );
    }
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG and WebP images are allowed');
    }
    if (detectImageFormat(file.buffer) === null) {
      throw new BadRequestException(
        'Uploaded file is not a valid JPEG, PNG or WebP image',
      );
    }
  }

  private imageExtension(buffer: Buffer): string {
    const detected = detectImageFormat(buffer);
    if (detected === null) {
      throw new BadRequestException(
        'Uploaded file is not a valid JPEG, PNG or WebP image',
      );
    }
    return IMAGE_FORMAT_EXTENSION[detected];
  }

  async create(dto: CreateProductDto): Promise<ProductDetail> {
    const name = normalizeName(dto.name);
    const baseSlug = productSlug(dto.name);
    const sku = normalizeSku(dto.sku);
    const description = trimmedOrNull(dto.description);
    const price = toDecimalInput(dto.price);
    const stock = dto.stock ?? DEFAULT_STOCK;
    const lowStockThreshold =
      dto.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
    const isActive = dto.isActive ?? DEFAULT_IS_ACTIVE;

    await this.ensureCategoryExists(dto.categoryId);

    const data = {
      name,
      sku,
      description,
      price,
      stock,
      lowStockThreshold,
      isActive,
      categoryId: dto.categoryId,
    };

    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
      const slug = await this.findAvailableSlug(baseSlug);
      try {
        const created = await this.prisma.product.create({
          data: { ...data, slug },
          select: PRODUCT_DETAIL_SELECT,
        });
        return toDetail(created);
      } catch (error) {
        if (!isPrismaError(error, UNIQUE_VIOLATION)) {
          throw error;
        }
        const target = uniqueViolationTarget(error);
        if (target.includes('sku')) {
          throw new ConflictException('A product with this SKU already exists');
        }
        if (target.includes('slug')) {
          continue;
        }
        throw new ConflictException('A product with this slug already exists');
      }
    }
    throw new ConflictException(
      'Could not generate a unique slug for this product',
    );
  }

  async findAll(
    query: ListProductsDto,
    isAuthenticated: boolean,
  ): Promise<ProductListResult> {
    const where = this.buildWhere(query, isAuthenticated);
    const orderBy = this.buildOrderBy(query);
    const skip = (query.page - 1) * query.limit;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: query.limit,
        select: PRODUCT_LIST_SELECT,
      }),
    ]);

    return {
      data: rows.map((row) => toListItem(row)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string, isAuthenticated: boolean): Promise<ProductDetail> {
    // Public consumers only see active products. An authenticated session
    // (the admin console) may inspect inactive products to preload their data.
    const row = await this.prisma.product.findFirst({
      where: { id, ...(isAuthenticated ? {} : { isActive: true }) },
      select: PRODUCT_DETAIL_SELECT,
    });
    if (!row) {
      throw new NotFoundException('Product not found');
    }
    return toDetail(row);
  }

  async findBySlug(slug: string): Promise<ProductDetail> {
    const row = await this.prisma.product.findFirst({
      where: { slug, isActive: true },
      select: PRODUCT_DETAIL_SELECT,
    });
    if (!row) {
      throw new NotFoundException('Product not found');
    }
    return toDetail(row);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDetail> {
    if (hasNoUpdatableFields(dto)) {
      throw new BadRequestException('Provide at least one field to update');
    }

    const existing = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });
    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    if (dto.categoryId !== undefined) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    const data: {
      name?: string;
      sku?: string;
      description?: string | null;
      price?: string;
      stock?: number;
      lowStockThreshold?: number;
      categoryId?: string;
      isActive?: boolean;
    } = {};

    if (dto.name !== undefined) {
      data.name = normalizeName(dto.name);
    }
    if (dto.sku !== undefined) {
      data.sku = normalizeSku(dto.sku);
    }
    if (dto.description !== undefined) {
      data.description = trimmedOrNull(dto.description);
    }
    if (dto.price !== undefined) {
      data.price = toDecimalInput(dto.price);
    }
    if (dto.stock !== undefined) {
      data.stock = dto.stock;
    }
    if (dto.lowStockThreshold !== undefined) {
      data.lowStockThreshold = dto.lowStockThreshold;
    }
    if (dto.categoryId !== undefined) {
      data.categoryId = dto.categoryId;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    const baseSlug =
      dto.name !== undefined ? productSlug(dto.name) : existing.slug;

    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
      const slug = await this.findAvailableSlug(baseSlug, id);
      try {
        const updated = await this.prisma.product.update({
          where: { id },
          data: { ...data, slug },
          select: PRODUCT_DETAIL_SELECT,
        });
        return toDetail(updated);
      } catch (error) {
        if (!isPrismaError(error, UNIQUE_VIOLATION)) {
          throw error;
        }
        const target = uniqueViolationTarget(error);
        if (target.includes('sku')) {
          throw new ConflictException('A product with this SKU already exists');
        }
        if (target.includes('slug')) {
          continue;
        }
        throw new ConflictException('A product with this slug already exists');
      }
    }
    throw new ConflictException(
      'Could not generate a unique slug for this product',
    );
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, imageUrl: true },
    });
    if (!existing) {
      throw new NotFoundException('Product not found');
    }
    await this.prisma.product.delete({ where: { id } });
    if (existing.imageUrl !== null) {
      // The product is already gone; failures are logged so an orphaned file
      // is not left unnoticed. No garbage collector exists by design.
      await this.images.delete(existing.imageUrl).catch((error) => {
        this.logger.error(
          `Failed to delete image ${existing.imageUrl} after deleting product ${id}`,
          error,
        );
      });
    }
  }

  private async findAvailableSlug(
    baseSlug: string,
    excludeId?: string,
  ): Promise<string> {
    let candidate = baseSlug;
    let attempt = 2;
    for (;;) {
      if (attempt > MAX_SLUG_ATTEMPTS + 1) {
        throw new ConflictException(
          'Could not generate a unique slug for this product',
        );
      }
      const conflict = await this.prisma.product.findFirst({
        where: {
          slug: candidate,
          ...(excludeId !== undefined ? { NOT: { id: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (!conflict) {
        return candidate;
      }
      candidate = `${baseSlug}-${attempt}`;
      attempt += 1;
    }
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }

  private buildWhere(
    query: ListProductsDto,
    isAuthenticated: boolean,
  ): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};

    const search = query.search?.trim();
    if (search !== undefined && search !== '') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId !== undefined) {
      where.categoryId = query.categoryId;
    }

    if (!isAuthenticated) {
      where.isActive = true;
    } else if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return where;
  }

  private buildOrderBy(
    query: ListProductsDto,
  ): Prisma.ProductOrderByWithRelationInput {
    switch (query.sort) {
      case 'name':
        return { name: query.order };
      case 'price':
        return { price: query.order };
      case 'stock':
        return { stock: query.order };
      case 'createdAt':
        return { createdAt: query.order };
    }
  }
}