export class CampaignStepDetailDto {
  id!: string;
  stepOrder!: number;
  stepType!: string;
  delayDays!: number;
  delayAnchor!: string;
  requiredState!: Record<string, string>;
  subjectTemplate!: string;
  bodyTemplate!: string;
}

export class CampaignSummaryDto {
  id!: string;
  name!: string;
  /** True for the location's newest active campaign — the one new requests default to. */
  isDefault!: boolean;
  stepCount!: number;
  requestCount!: number;
  createdAt!: Date;
  updatedAt!: Date;
}

export class CampaignDetailDto extends CampaignSummaryDto {
  locationId!: string;
  steps!: CampaignStepDetailDto[];
}
