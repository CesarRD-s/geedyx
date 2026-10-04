import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsIn(['es', 'en'])
  language?: 'es' | 'en' | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timeZone?: string | null;
}
