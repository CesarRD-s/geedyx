import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(1, 120)
  displayName!: string;

  @IsEmail()
  @Length(3, 320)
  email!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  roleCodes!: string[];

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @Length(3, 240)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  currentPassword?: string;
}
