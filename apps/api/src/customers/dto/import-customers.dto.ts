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

/** One CSV row, pre-parsed on the client. Validation here is structural only —
 *  per-row content (bad emails, blanks) is sorted out in the service so a single
 *  junk row doesn't reject the whole import. */
export class ImportCustomerRowDto {
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

export class ImportCustomersDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  locationId!: string;

  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => ImportCustomerRowDto)
  rows!: ImportCustomerRowDto[];
}
