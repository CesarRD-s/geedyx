import { IsIn, IsString, Length } from 'class-validator';

export class UpdateUserStatusDto {
  @IsIn(['ACTIVE', 'DISABLED', 'LOCKED'])
  status!: 'ACTIVE' | 'DISABLED' | 'LOCKED';

  @IsString()
  @Length(3, 240)
  reason!: string;
}
