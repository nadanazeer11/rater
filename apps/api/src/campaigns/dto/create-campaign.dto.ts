import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  locationId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}
