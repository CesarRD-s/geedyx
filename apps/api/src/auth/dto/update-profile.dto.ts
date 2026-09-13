import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(120) displayName?: string;
  @IsOptional() @IsIn(['es', 'en']) locale?: 'es' | 'en';
  @IsOptional() @IsString() @MaxLength(64) timeZone?: string;
}
