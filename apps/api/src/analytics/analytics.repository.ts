import { Injectable } from '@nestjs/common';
import { Prisma } from '@rater/db';
import { PrismaService } from '../prisma/prisma.service';

export interface FunnelArgs {
  locationId: string;
  from?: string;
  to?: string;
  campaignId?: string;
}

export interface FunnelCounts {
  sent: number;
  delivered: number;
  opened: number;
  rated: number;
  routed: number;
  posted: number;
}

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMembership(authUserId: string, locationId: string) {
    return this.prisma.locationUser.findFirst({
      where: { authUserId, locationId },
      select: { id: true },
    });
  }

  async overview(locationId: string): Promise<{
    requestsSent: number;
    awaitingResponse: number;
    newGoogleReviews: number;
    baselineCaptured: boolean;
  }> {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, deletedAt: null },
      select: { baselineScrapedAt: true },
    });
    const baselineAt = location?.baselineScrapedAt ?? null;
    const reqWhere: Prisma.ReviewRequestWhereInput = { locationId, deletedAt: null };

    const [requestsSent, awaitingResponse, newGoogleReviews] = await Promise.all([
      // "Sent" = the email left the system (anything past the initial pending).
      this.prisma.reviewRequest.count({
        where: { ...reqWhere, deliveryStatus: { not: 'pending' } },
      }),
      // Emailed, not bounced, still hasn't rated.
      this.prisma.reviewRequest.count({
        where: {
          ...reqWhere,
          ratingStatus: 'not_rated',
          deliveryStatus: { in: ['sent', 'delivered'] },
        },
      }),
      // Reviews posted since the baseline scrape. 0 (not "all") until a baseline exists.
      baselineAt
        ? this.prisma.googleReview.count({
            where: { locationId, removedAt: null, postedAt: { gt: baselineAt } },
          })
        : Promise.resolve(0),
    ]);

    return {
      requestsSent,
      awaitingResponse,
      newGoogleReviews,
      baselineCaptured: baselineAt !== null,
    };
  }

  async funnel(args: FunnelArgs): Promise<FunnelCounts> {
    const base: Prisma.ReviewRequestWhereInput = {
      locationId: args.locationId,
      deletedAt: null,
    };
    if (args.campaignId) base.campaignId = args.campaignId;
    if (args.from || args.to) {
      base.createdAt = {
        ...(args.from ? { gte: new Date(args.from) } : {}),
        ...(args.to ? { lte: new Date(args.to) } : {}),
      };
    }

    const [sent, delivered, opened, rated, routed, posted] =
      await this.prisma.$transaction([
        this.prisma.reviewRequest.count({
          where: { ...base, deliveryStatus: { not: 'pending' } },
        }),
        this.prisma.reviewRequest.count({
          where: { ...base, deliveryStatus: 'delivered' },
        }),
        this.prisma.reviewRequest.count({
          where: {
            ...base,
            engagementStatus: { in: ['opened', 'link_clicked', 'landing_viewed'] },
          },
        }),
        this.prisma.reviewRequest.count({
          where: {
            ...base,
            ratingStatus: { in: ['rated_positive', 'rated_negative', 'feedback_submitted'] },
          },
        }),
        this.prisma.reviewRequest.count({
          where: { ...base, redirectedToGoogleAt: { not: null } },
        }),
        this.prisma.reviewRequest.count({
          where: { ...base, googleAttributionStatus: 'confirmed_posted' },
        }),
      ]);

    return { sent, delivered, opened, rated, routed, posted };
  }
}
