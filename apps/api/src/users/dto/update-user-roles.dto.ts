import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class UpdateUserRolesDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  roleCodes!: string[];

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 240)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  currentPassword?: string;
}
