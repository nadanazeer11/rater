import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
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
import {
  CAMPAIGN_DELAY_ANCHORS,
  CAMPAIGN_STEP_TYPES,
  type CampaignDelayAnchor,
  type CampaignStepType,
} from '@rater/types';

/** One step as the editor submits it. `stepOrder` is the array index (+1) — not
 *  sent. The "exactly one initial, first" rule is enforced in the service. */
export class CampaignStepDto {
  @IsIn(CAMPAIGN_STEP_TYPES)
  stepType!: CampaignStepType;

  @IsInt()
  @Min(0)
  @Max(365)
  delayDays!: number;

  @IsIn(CAMPAIGN_DELAY_ANCHORS)
  delayAnchor!: CampaignDelayAnchor;

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
