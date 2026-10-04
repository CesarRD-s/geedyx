import { IsEmail, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(1, 120)
  displayName!: string;

  @IsEmail()
  @Length(3, 320)
  email!: string;
}
