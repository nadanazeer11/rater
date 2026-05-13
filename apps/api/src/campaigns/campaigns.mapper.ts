import type { CampaignStep } from '@rater/db';
import {
  CampaignDetailDto,
  CampaignStepDetailDto,
  CampaignSummaryDto,
} from './dto/campaign.response';
import type { CampaignWithCounts, CampaignWithSteps } from './campaigns.repository';

export function toCampaignSummary(
  c: CampaignWithCounts,
  isDefault: boolean,
): CampaignSummaryDto {
  return {
    id: c.id,
    name: c.name,
    isDefault,
    stepCount: c._count.steps,
    requestCount: c._count.reviewRequests,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function toStepDetail(s: CampaignStep): CampaignStepDetailDto {
  return {
    id: s.id,
    stepOrder: s.stepOrder,
    stepType: s.stepType,
    delayDays: s.delayDays,
    delayAnchor: s.delayAnchor,
    requiredState: (s.requiredState ?? {}) as Record<string, string>,
    subjectTemplate: s.subjectTemplate,
    bodyTemplate: s.bodyTemplate,
  };
}

export function toCampaignDetail(
  c: CampaignWithSteps,
  isDefault: boolean,
): CampaignDetailDto {
  return {
    id: c.id,
    name: c.name,
    isDefault,
    stepCount: c.steps.length,
    requestCount: c._count.reviewRequests,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    locationId: c.locationId,
    steps: c.steps.map(toStepDetail),
  };
}
