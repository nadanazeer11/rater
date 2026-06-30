import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttributionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMembership(authUserId: string, locationId: string) {
    return this.prisma.locationUser.findFirst({
      where: { authUserId, locationId },
      select: { id: true },
    });
  }

  listPending(locationId: string) {
    return this.prisma.googleReview.findMany({
      where: {
        locationId,
        removedAt: null,
        attributedReviewRequestId: { not: null },
        attributionConfirmedManually: false,
      },
      orderBy: { postedAt: 'desc' },
      select: {
        id: true,
        reviewerName: true,
        rating: true,
        text: true,
        postedAt: true,
        attributionConfidence: true,
        attributedReviewRequest: {
          select: { id: true, customer: { select: { name: true, email: true } } },
        },
      },
    });
  }

  /** A tentative review (attributed, not yet manually confirmed) + the request
   *  it points at. Used to confirm/reject one match. */
  findTentative(reviewId: string) {
    return this.prisma.googleReview.findFirst({
      where: {
        id: reviewId,
        attributedReviewRequestId: { not: null },
        attributionConfirmedManually: false,
      },
      select: {
        id: true,
        locationId: true,
        attributedReviewRequestId: true,
        attributedReviewRequest: { select: { customerId: true } },
      },
    });
  }

  confirm(reviewId: string, reviewRequestId: string, customerId: string) {
    return this.prisma.$transaction([
      this.prisma.googleReview.update({
        where: { id: reviewId },
        data: { attributionConfirmedManually: true },
      }),
      this.prisma.reviewRequest.update({
        where: { id: reviewRequestId },
        data: { googleAttributionStatus: 'confirmed_posted' },
      }),
      this.prisma.customer.update({
        where: { id: customerId },
        data: { hasAttributedGoogleReview: true },
      }),
      this.prisma.event.create({
        data: {
          reviewRequestId,
          eventType: 'google_review_attributed',
          payload: { googleReviewId: reviewId, confirmedBy: 'manual' },
        },
      }),
    ]);
  }

  reject(reviewId: string, reviewRequestId: string) {
    return this.prisma.$transaction([
      this.prisma.googleReview.update({
        where: { id: reviewId },
        data: {
          attributedReviewRequestId: null,
          attributionConfidence: null,
          attributionConfirmedManually: false,
        },
      }),
      this.prisma.reviewRequest.update({
        where: { id: reviewRequestId },
        data: { googleAttributionStatus: 'not_posted' },
      }),
      this.prisma.event.create({
        data: {
          reviewRequestId,
          eventType: 'google_review_match_rejected',
          payload: { googleReviewId: reviewId },
        },
      }),
    ]);
  }
}
