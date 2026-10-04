import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../http/pagination.dto';

export class ListAuditDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  module?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  action?: string;

  @IsOptional()
  @IsIn(['SUCCESS', 'FAILURE'])
  outcome?: 'SUCCESS' | 'FAILURE';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  query?: string;
}
