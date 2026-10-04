import { IsString, Length, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @Length(1, 256)
  currentPassword!: string;

  @IsString()
  @Length(8, 256)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message:
      'La contraseña debe incluir una mayúscula, un número y un carácter especial.',
  })
  newPassword!: string;
}
