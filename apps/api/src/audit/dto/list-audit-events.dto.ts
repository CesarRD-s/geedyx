import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListAuditEventsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 25;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() actorId?: string;
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsIn(['SUCCEEDED', 'FAILED', 'DENIED']) outcome?: 'SUCCEEDED' | 'FAILED' | 'DENIED';
  @IsOptional() @IsString() targetType?: string;
  @IsOptional() @IsString() targetId?: string;
}
