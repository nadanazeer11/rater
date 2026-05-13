import { Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ReviewRequestCustomerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;
}

export class CreateReviewRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  locationId!: string;

  /** Which campaign runs this request. Omitted → the location's default
   *  (newest active) campaign. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  campaignId?: string;

  @ValidateNested()
  @Type(() => ReviewRequestCustomerDto)
  customer!: ReviewRequestCustomerDto;
}
