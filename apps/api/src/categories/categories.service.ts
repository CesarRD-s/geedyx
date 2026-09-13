import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { normalizeName, slugify } from './slug.js';

const CATEGORY_SELECT = { id: true, name: true, slug: true } as const;

const UNIQUE_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';
const RELATION_VIOLATION = 'P2014';

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

function normalizedSlug(name: string): string {
  const normalized = normalizeName(name);
  if (!normalized) {
    throw new BadRequestException('Category name cannot be empty');
  }
  const slug = slugify(normalized);
  if (!slug) {
    throw new BadRequestException(
      'Category name must produce a URL-friendly slug',
    );
  }
  return slug;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const name = normalizeName(dto.name);
    const slug = normalizedSlug(name);

    const existing = await this.prisma.category.findUnique({
      where: { slug },
      select: CATEGORY_SELECT,
    });
    if (existing) {
      throw new ConflictException('A category with this name already exists');
    }

    try {
      return await this.prisma.category.create({
        data: { name, slug },
        select: CATEGORY_SELECT,
      });
    } catch (error) {
      if (isPrismaError(error, UNIQUE_VIOLATION)) {
        throw new ConflictException('A category with this name already exists');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: CATEGORY_SELECT,
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: CATEGORY_SELECT,
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      select: CATEGORY_SELECT,
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    if (dto.name === undefined) {
      throw new BadRequestException('Provide a field to update');
    }

    const existing = await this.prisma.category.findUnique({
      where: { id },
      select: CATEGORY_SELECT,
    });
    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    const name = normalizeName(dto.name);
    const slug = normalizedSlug(name);

    const conflict = await this.prisma.category.findFirst({
      where: { slug, NOT: { id } },
      select: CATEGORY_SELECT,
    });
    if (conflict) {
      throw new ConflictException('A category with this name already exists');
    }

    try {
      return await this.prisma.category.update({
        where: { id },
        data: { name, slug },
        select: CATEGORY_SELECT,
      });
    } catch (error) {
      if (isPrismaError(error, UNIQUE_VIOLATION)) {
        throw new ConflictException('A category with this name already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      select: CATEGORY_SELECT,
    });
    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });
    if (productCount > 0) {
      throw new ConflictException(
        'Cannot delete a category that has associated products',
      );
    }

    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      if (isPrismaError(error, FOREIGN_KEY_VIOLATION, RELATION_VIOLATION)) {
        throw new ConflictException(
          'Cannot delete a category that has associated products',
        );
      }
      throw error;
    }
  }
}
