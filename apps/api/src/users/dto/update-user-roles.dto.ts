import { ArrayMaxSize, IsArray, IsString, Length } from 'class-validator';

export class UpdateUserRolesDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  roleCodes!: string[];

  @IsString()
  @Length(3, 240)
  reason!: string;
}
