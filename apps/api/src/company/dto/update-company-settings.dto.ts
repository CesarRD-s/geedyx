import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCompanySettingsDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsIn(['es', 'en']) locale?: 'es' | 'en';
  @IsOptional() @IsString() @MaxLength(64) timeZone?: string;
  @IsOptional() @IsIn(['HNL', 'USD', 'MXN', 'COP', 'EUR']) currency?: string;
}
