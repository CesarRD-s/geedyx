import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  parentId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
