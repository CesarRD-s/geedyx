import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @Length(1, 180)
  title!: string;

  @IsString()
  @Length(1, 80)
  sku!: string;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  barcode?: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  categoryId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 160)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  brand?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  model?: string;
}
