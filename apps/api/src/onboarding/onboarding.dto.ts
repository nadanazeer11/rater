import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class OnboardingLocationDto {
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

export class OnboardingDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  businessName!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => OnboardingLocationDto)
  locations!: OnboardingLocationDto[];
}
