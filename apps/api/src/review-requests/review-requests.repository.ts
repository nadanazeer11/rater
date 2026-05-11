import { Injectable } from '@nestjs/common';
import { Prisma } from '@rater/db';
import { PrismaService } from '../prisma/prisma.service';

export type RequestWithCustomer = Prisma.ReviewRequestGetPayload<{
  include: { customer: { select: { name: true; email: true } } };
}>;

export type RequestByToken = Prisma.ReviewRequestGetPayload<{
  select: {
    id: true;
    engagementStatus: true;
    ratingStatus: true;
    location: {
      select: {
        positiveRatingThreshold: true;
        googleReviewUrl: true;
        name: true;
        business: { select: { name: true } };
      };
    };
    ratingSubmission: { select: { rating: true; routedTo: true } };
    feedbackSubmission: { select: { id: true } };
  };
}>;

@Injectable()
export class ReviewRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMembership(authUserId: string, locationId: string) {
    return this.prisma.locationUser.findFirst({
      where: { authUserId, locationId },
      select: { id: true },
    });
  }

  findLocation(locationId: string) {
    return this.prisma.location.findFirst({
      where: { id: locationId, deletedAt: null },
      select: { id: true, customerCooldownDays: true, positiveRatingThreshold: true },
    });
  }

  findDefaultCampaign(locationId: string) {
    return this.prisma.campaign.findFirst({
      where: { locationId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
  }

  createDefaultCampaign(locationId: string) {
    return this.prisma.campaign.create({
      data: {
        locationId,
        name: 'Review requests',
        steps: {
          create: {
            stepOrder: 1,
            stepType: 'initial',
            delayDays: 0,
            delayAnchor: 'request_created',
            requiredState: {},
            subjectTemplate: 'How was your visit to {{location}}?',
            bodyTemplate:
              'Hi {{name}},\n\nThanks for choosing {{location}}. Could you take 10 seconds to rate your visit?\n\n{{rate_link}}\n\n— The {{business}} team',
          },
        },
      },
      select: { id: true },
    });
  }

  findRecentRequestForCustomer(customerId: string, since: Date) {
    return this.prisma.reviewRequest.findFirst({
      where: { customerId, deletedAt: null, createdAt: { gte: since } },
      select: { id: true },
    });
  }

  async findRecentRequestCustomerIds(customerIds: string[], since: Date): Promise<string[]> {
    if (customerIds.length === 0) return [];
    const rows = await this.prisma.reviewRequest.findMany({
      where: { customerId: { in: customerIds }, deletedAt: null, createdAt: { gte: since } },
      distinct: ['customerId'],
      select: { customerId: true },
    });
    return rows.map((r) => r.customerId);
  }

  createRequestWithEvent(input: {
    locationId: string;
    customerId: string;
    campaignId: string;
    via: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const req = await tx.reviewRequest.create({
        data: {
          locationId: input.locationId,
          customerId: input.customerId,
          campaignId: input.campaignId,
        },
        select: { id: true, publicToken: true },
      });
      await tx.event.create({
        data: {
          reviewRequestId: req.id,
          eventType: 'review_request_created',
          payload: { customerId: input.customerId, via: input.via },
        },
      });
      return req;
    });
  }

  listByLocation(locationId: string): Promise<RequestWithCustomer[]> {
    return this.prisma.reviewRequest.findMany({
      where: { locationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true, email: true } } },
    });
  }

  findByPublicToken(token: string): Promise<RequestByToken | null> {
    return this.prisma.reviewRequest.findUnique({
      where: { publicToken: token },
      select: {
        id: true,
        engagementStatus: true,
        ratingStatus: true,
        location: {
          select: {
            positiveRatingThreshold: true,
            googleReviewUrl: true,
            name: true,
            business: { select: { name: true } },
          },
        },
        ratingSubmission: { select: { rating: true, routedTo: true } },
        feedbackSubmission: { select: { id: true } },
      },
    });
  }

  markLanded(id: string) {
    return this.prisma.reviewRequest.update({
      where: { id },
      data: { engagementStatus: 'landing_viewed' },
    });
  }

  async markRedirectedToGoogleByToken(token: string): Promise<void> {
    const req = await this.prisma.reviewRequest.findUnique({
      where: { publicToken: token },
      select: { id: true, redirectedToGoogleAt: true },
    });
    if (!req || req.redirectedToGoogleAt) return; // unknown token, or already recorded
    await this.prisma.$transaction(async (tx) => {
      await tx.reviewRequest.updateMany({
        where: { id: req.id, redirectedToGoogleAt: null },
        data: { redirectedToGoogleAt: new Date() },
      });
      await tx.event.create({
        data: { reviewRequestId: req.id, eventType: 'redirected_to_google', payload: {} },
      });
    });
  }

  createRating(
    reviewRequestId: string,
    data: {
      rating: number;
      routedTo: string;
      ratingStatus: string;
      googleAttributionStatus: string;
      ipAddress: string | null;
      userAgent: string | null;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.ratingSubmission.create({
        data: {
          reviewRequestId,
          rating: data.rating,
          routedTo: data.routedTo,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
      await tx.reviewRequest.update({
        where: { id: reviewRequestId },
        data: {
          ratingStatus: data.ratingStatus,
          googleAttributionStatus: data.googleAttributionStatus,
        },
      });
      await tx.event.create({
        data: {
          reviewRequestId,
          eventType: 'rating_submitted',
          payload: { rating: data.rating, routedTo: data.routedTo },
        },
      });
    });
  }

  createFeedback(reviewRequestId: string, text: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.feedbackSubmission.create({ data: { reviewRequestId, text } });
      await tx.reviewRequest.update({
        where: { id: reviewRequestId },
        data: { ratingStatus: 'feedback_submitted' },
      });
      await tx.event.create({
        data: { reviewRequestId, eventType: 'feedback_submitted', payload: {} },
      });
    });
  }
}
