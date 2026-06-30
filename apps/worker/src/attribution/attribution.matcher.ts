import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@rater/db';
import { scoreAttribution, type AttributionConfidence } from '@rater/types';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 86_400_000;
/** If a request has been waiting this long past its expected time with no match,
 *  call it not_posted (the customer didn't leave a Google review). */
const NOT_POSTED_AFTER_MS = 30 * DAY_MS;

@Injectable()
export class AttributionMatcher {
  private readonly logger = new Logger(AttributionMatcher.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Matches a location's still-pending requests (rated positive, redirected to
   * Google, awaiting a posted review) against its unattributed Google reviews.
   * High confidence auto-confirms; medium/low is attributed tentatively for the
   * manual-confirm queue; long-waiting unmatched requests become not_posted.
   */
  async runForLocation(locationId: string): Promise<{ attributed: number; pendingQueue: number; notPosted: number }> {
    const requests = await this.prisma.reviewRequest.findMany({
      where: { locationId, deletedAt: null, googleAttributionStatus: 'pending_check' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        customerId: true,
        createdAt: true,
        redirectedToGoogleAt: true,
        customer: { select: { name: true } },
        ratingSubmission: { select: { submittedAt: true } },
      },
    });
    if (requests.length === 0) return { attributed: 0, pendingQueue: 0, notPosted: 0 };

    const reviews = await this.prisma.googleReview.findMany({
      where: { locationId, removedAt: null, attributedReviewRequestId: null },
      select: { id: true, reviewerName: true, postedAt: true },
    });

    const claimed = new Set<string>();
    let attributed = 0;
    let pendingQueue = 0;
    let notPosted = 0;
    const now = Date.now();

    for (const req of requests) {
      const requestAt =
        req.redirectedToGoogleAt ?? req.ratingSubmission?.submittedAt ?? req.createdAt;

      let best: { reviewId: string; confidence: AttributionConfidence; score: number } | null = null;
      for (const review of reviews) {
        if (claimed.has(review.id)) continue;
        const { confidence, score } = scoreAttribution({
          customerName: req.customer.name,
          reviewerName: review.reviewerName,
          requestAt,
          reviewPostedAt: review.postedAt,
        });
        if (confidence && (!best || score > best.score)) {
          best = { reviewId: review.id, confidence, score };
        }
      }

      if (best) {
        claimed.add(best.reviewId);
        const isHigh = best.confidence === 'high';
        try {
          await this.prisma.$transaction([
            this.prisma.googleReview.update({
              where: { id: best.reviewId },
              data: {
                attributedReviewRequestId: req.id,
                attributionConfidence: best.confidence,
                attributionConfirmedManually: isHigh,
              },
            }),
            this.prisma.reviewRequest.update({
              where: { id: req.id },
              data: {
                googleAttributionStatus: isHigh ? 'confirmed_posted' : 'posted_low_confidence',
              },
            }),
            ...(isHigh
              ? [
                  this.prisma.customer.update({
                    where: { id: req.customerId },
                    data: { hasAttributedGoogleReview: true },
                  }),
                ]
              : []),
            this.prisma.event.create({
              data: {
                reviewRequestId: req.id,
                eventType: isHigh ? 'google_review_attributed' : 'google_review_match_pending',
                payload: { googleReviewId: best.reviewId, confidence: best.confidence },
              },
            }),
          ]);
          if (isHigh) attributed += 1;
          else pendingQueue += 1;
        } catch (err) {
          // Unique constraint = the review got claimed concurrently; skip it.
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            claimed.add(best.reviewId);
            continue;
          }
          throw err;
        }
        continue;
      }

      // No candidate review. If we've waited long enough, conclude not_posted.
      if (now - new Date(requestAt).getTime() > NOT_POSTED_AFTER_MS) {
        await this.prisma.$transaction([
          this.prisma.reviewRequest.update({
            where: { id: req.id },
            data: { googleAttributionStatus: 'not_posted' },
          }),
          this.prisma.event.create({
            data: { reviewRequestId: req.id, eventType: 'google_review_not_found', payload: {} },
          }),
        ]);
        notPosted += 1;
      }
    }

    if (attributed || pendingQueue || notPosted) {
      this.logger.log(
        `Attribution ${locationId}: ${attributed} confirmed, ${pendingQueue} queued, ${notPosted} not-posted`,
      );
    }
    return { attributed, pendingQueue, notPosted };
  }
}
