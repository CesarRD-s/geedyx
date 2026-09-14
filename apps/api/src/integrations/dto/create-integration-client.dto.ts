import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateIntegrationClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  scopes: string[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;
}
