import { Injectable } from '@nestjs/common';
import { Prisma } from '@rater/db';
import { PrismaService } from '../prisma/prisma.service';

const detailInclude = {
  steps: { orderBy: { stepOrder: 'asc' } },
  _count: { select: { reviewRequests: true } },
} satisfies Prisma.CampaignInclude;

const summaryInclude = {
  _count: { select: { steps: true, reviewRequests: true } },
} satisfies Prisma.CampaignInclude;

export type CampaignWithSteps = Prisma.CampaignGetPayload<{
  include: typeof detailInclude;
}>;
export type CampaignWithCounts = Prisma.CampaignGetPayload<{
  include: typeof summaryInclude;
}>;

/** The seed step every freshly-created campaign starts with. Mirrors the
 *  placeholder template text — there's no `{{...}}` render engine yet. */
const SEED_INITIAL_STEP = {
  stepOrder: 1,
  stepType: 'initial',
  delayDays: 0,
  delayAnchor: 'request_created',
  requiredState: {} as Prisma.InputJsonValue,
  subjectTemplate: 'How was your visit to {{location}}?',
  bodyTemplate:
    'Hi {{name}},\n\nThanks for choosing {{location}}. Could you take 10 seconds to rate your visit?\n\n{{rate_link}}\n\n— The {{business}} team',
};

@Injectable()
export class CampaignsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMembership(authUserId: string, locationId: string) {
    return this.prisma.locationUser.findFirst({
      where: { authUserId, locationId },
      select: { id: true },
    });
  }

  listByLocation(locationId: string): Promise<CampaignWithCounts[]> {
    return this.prisma.campaign.findMany({
      where: { locationId, isActive: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: summaryInclude,
    });
  }

  findById(id: string): Promise<CampaignWithSteps | null> {
    return this.prisma.campaign.findUnique({
      where: { id },
      include: detailInclude,
    });
  }

  /** The location's newest active campaign — the "default". */
  findNewestActive(locationId: string) {
    return this.prisma.campaign.findFirst({
      where: { locationId, isActive: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });
  }

  /** Validates a caller-supplied campaign id belongs to the location and is live. */
  findActiveByIdAndLocation(id: string, locationId: string) {
    return this.prisma.campaign.findFirst({
      where: { id, locationId, isActive: true },
      select: { id: true },
    });
  }

  countActiveByLocation(locationId: string): Promise<number> {
    return this.prisma.campaign.count({ where: { locationId, isActive: true } });
  }

  create(locationId: string, name: string): Promise<CampaignWithSteps> {
    return this.prisma.campaign.create({
      data: { locationId, name, steps: { create: SEED_INITIAL_STEP } },
      include: detailInclude,
    });
  }

  /** Used on the first review request for a location with no campaign yet
   *  (concurrent first calls could create two — harmless; newest wins next time). */
  async getOrCreateDefault(locationId: string): Promise<{ id: string }> {
    const existing = await this.findNewestActive(locationId);
    if (existing) return existing;
    const created = await this.create(locationId, 'Review requests');
    return { id: created.id };
  }

  /** Replaces the whole step set (there are zero step executions, so this is
   *  safe) and/or renames, then re-reads the campaign. */
  update(
    id: string,
    data: {
      name?: string;
      steps?: {
        stepType: string;
        delayDays: number;
        delayAnchor: string;
        requiredState: Record<string, string>;
        subjectTemplate: string;
        bodyTemplate: string;
      }[];
    },
  ): Promise<CampaignWithSteps> {
    return this.prisma.$transaction(async (tx) => {
      if (data.name !== undefined) {
        await tx.campaign.update({ where: { id }, data: { name: data.name } });
      }
      if (data.steps) {
        await tx.campaignStep.deleteMany({ where: { campaignId: id } });
        await tx.campaignStep.createMany({
          data: data.steps.map((s, i) => ({
            campaignId: id,
            stepOrder: i + 1,
            stepType: s.stepType,
            delayDays: s.delayDays,
            delayAnchor: s.delayAnchor,
            requiredState: s.requiredState as Prisma.InputJsonValue,
            subjectTemplate: s.subjectTemplate,
            bodyTemplate: s.bodyTemplate,
          })),
        });
      }
      return tx.campaign.findUniqueOrThrow({ where: { id }, include: detailInclude });
    });
  }

  archive(id: string) {
    return this.prisma.campaign.update({ where: { id }, data: { isActive: false } });
  }
}
