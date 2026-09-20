import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class CreateOwnerDto {
  @IsString()
  @Length(1, 120)
  displayName!: string;

  @IsEmail()
  @Length(3, 320)
  email!: string;

  @IsString()
  @Length(8, 256)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message:
      'La contraseña debe incluir una mayúscula, un número y un carácter especial.',
  })
  password!: string;

  @IsString()
  @Length(8, 256)
  passwordConfirmation!: string;
}
