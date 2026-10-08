import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class IssueTemporaryPasswordDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 240)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  currentPassword?: string;
}
