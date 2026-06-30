import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.type';
import type { CreateCampaignDto } from './dto/create-campaign.dto';
import type {
  CampaignDetailDto,
  CampaignSummaryDto,
} from './dto/campaign.response';
import type { CampaignStepDto, UpdateCampaignDto } from './dto/update-campaign.dto';
import { toCampaignDetail, toCampaignSummary } from './campaigns.mapper';
import { CampaignsRepository } from './campaigns.repository';

function validateSteps(steps: CampaignStepDto[]): void {
  // stepType / delayAnchor vocab is validated by @IsIn on the DTO; here we
  // enforce the structural rules the enum can't express.
  steps.forEach((s, i) => {
    const isInitial = s.stepType === 'initial';
    if (i === 0 && !isInitial) {
      throw new BadRequestException('The first step must be the initial email.');
    }
    if (i > 0 && isInitial) {
      throw new BadRequestException('Only the first step can be the initial email.');
    }
    if (!s.subjectTemplate.trim()) {
      throw new BadRequestException('A step subject cannot be empty.');
    }
    if (!s.bodyTemplate.trim()) {
      throw new BadRequestException('A step body cannot be empty.');
    }
  });
}

@Injectable()
export class CampaignsService {
  constructor(private readonly repo: CampaignsRepository) {}

  private async assertMember(user: AuthUser, locationId: string): Promise<void> {
    if (!locationId) throw new BadRequestException('locationId is required.');
    const membership = await this.repo.findMembership(user.id, locationId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this location.');
    }
  }

  async list(user: AuthUser, locationId: string): Promise<CampaignSummaryDto[]> {
    await this.assertMember(user, locationId);
    await this.repo.getOrCreateDefault(locationId);
    const campaigns = await this.repo.listByLocation(locationId);
    // listByLocation is newest-first, so index 0 is the default.
    return campaigns.map((c, i) => toCampaignSummary(c, i === 0));
  }

  async get(user: AuthUser, id: string): Promise<CampaignDetailDto> {
    const campaign = await this.repo.findById(id);
    if (!campaign) throw new NotFoundException('Campaign not found.');
    await this.assertMember(user, campaign.locationId);
    const newest = await this.repo.findNewestActive(campaign.locationId);
    return toCampaignDetail(campaign, newest?.id === campaign.id);
  }

  async create(
    user: AuthUser,
    dto: CreateCampaignDto,
  ): Promise<CampaignDetailDto> {
    await this.assertMember(user, dto.locationId);
    const created = await this.repo.create(dto.locationId, dto.name.trim());
    return toCampaignDetail(created, true); // newest → default
  }

  async update(
    user: AuthUser,
    id: string,
    dto: UpdateCampaignDto,
  ): Promise<CampaignDetailDto> {
    const campaign = await this.repo.findById(id);
    if (!campaign) throw new NotFoundException('Campaign not found.');
    await this.assertMember(user, campaign.locationId);
    if (dto.steps) validateSteps(dto.steps);

    const updated = await this.repo.update(id, {
      name: dto.name?.trim(),
      steps: dto.steps?.map((s) => ({
        stepType: s.stepType,
        delayDays: s.delayDays,
        delayAnchor: s.delayAnchor,
        requiredState: s.requiredState,
        subjectTemplate: s.subjectTemplate.trim(),
        bodyTemplate: s.bodyTemplate.trim(),
      })),
    });
    const newest = await this.repo.findNewestActive(campaign.locationId);
    return toCampaignDetail(updated, newest?.id === id);
  }

  async archive(user: AuthUser, id: string): Promise<void> {
    const campaign = await this.repo.findById(id);
    if (!campaign) throw new NotFoundException('Campaign not found.');
    await this.assertMember(user, campaign.locationId);
    if (!campaign.isActive) return;
    const activeCount = await this.repo.countActiveByLocation(campaign.locationId);
    if (activeCount <= 1) {
      throw new ConflictException(
        'You need at least one campaign. Create another before archiving this one.',
      );
    }
    await this.repo.archive(id);
  }
}
