import { IsString, Length } from 'class-validator';

export class IssueTemporaryPasswordDto {
  @IsString()
  @Length(3, 240)
  reason!: string;
}
