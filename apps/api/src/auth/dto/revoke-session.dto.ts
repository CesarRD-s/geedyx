import { IsNotEmpty, IsString } from 'class-validator';

export class RevokeSessionDto {
  @IsNotEmpty()
  @IsString()
  sessionId!: string;

  @IsNotEmpty()
  @IsString()
  sessionManagementToken!: string;
}
