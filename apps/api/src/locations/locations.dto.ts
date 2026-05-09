import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  googlePlaceId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  googleReviewUrl?: string;
}
