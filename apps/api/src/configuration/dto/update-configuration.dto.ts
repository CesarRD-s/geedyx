import { IsIn, IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class UpdateConfigurationDto {
  @IsOptional()
  @IsString()
  @Length(1, 160)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  country?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @Length(1, 500)
  logoUrl?: string | null;

  @IsOptional()
  @IsIn(['es', 'en'])
  locale?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  timeZone?: string | null;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string | null;

  @IsOptional()
  @IsIn(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'])
  dateFormat?: string;

  @IsOptional()
  @IsIn(['12', '24'])
  timeFormat?: string;
}
