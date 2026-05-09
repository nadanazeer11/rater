import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

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

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  googleRating?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  googleReviewsCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  googleAddress?: string;
}
