import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** One pre-parsed CSV row. Structural validation only — bad emails / blanks are
 *  sorted out per-row in the service so one junk row doesn't reject the import. */
export class ImportReviewRequestRowDto {
  @IsString()
  @MaxLength(320)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;
}

export class ImportReviewRequestsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  locationId!: string;

  /** Which campaign runs these requests. Omitted → the location's default
   *  (newest active) campaign. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  campaignId?: string;

  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => ImportReviewRequestRowDto)
  rows!: ImportReviewRequestRowDto[];
}
