import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @Length(1, 180)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  sku?: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  barcode?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 160)
  shortDescription?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  brand?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  model?: string | null;

  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'ARCHIVED'])
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

  @IsOptional()
  @IsIn(['INTERNAL', 'PUBLIC'])
  visibility?: 'INTERNAL' | 'PUBLIC';
}
