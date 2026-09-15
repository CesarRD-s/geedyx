import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(12)
  password: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}
