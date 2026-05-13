import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** One step as the editor submits it. `stepOrder` is the array index (+1) — not
 *  sent. Vocab (`stepType`, `delayAnchor`) and the "exactly one initial, first"
 *  rule are enforced in the service. */
export class CampaignStepDto {
  @IsString()
  @MaxLength(64)
  stepType!: string;

  @IsInt()
  @Min(0)
  @Max(365)
  delayDays!: number;

  @IsString()
  @MaxLength(64)
  delayAnchor!: string;

  @IsObject()
  requiredState!: Record<string, string>;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  subjectTemplate!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  bodyTemplate!: string;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CampaignStepDto)
  steps?: CampaignStepDto[];
}
