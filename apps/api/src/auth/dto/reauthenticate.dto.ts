import { IsNotEmpty, IsString } from 'class-validator';

export class ReauthenticateDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}
