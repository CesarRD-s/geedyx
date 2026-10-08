import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpdateUserStatusDto {
  @IsIn(['ACTIVE', 'DISABLED', 'LOCKED'])
  status!: 'ACTIVE' | 'DISABLED' | 'LOCKED';

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 240)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  currentPassword?: string;
}
