import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class CreateInvitationDto {
  @IsString()
  @MinLength(1)
  locationId!: string;

  @IsEmail()
  email!: string;

  @IsIn(['admin', 'member'])
  role!: 'admin' | 'member';
}
