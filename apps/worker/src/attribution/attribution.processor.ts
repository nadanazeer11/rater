import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SentimentClassifier } from '../ai/sentiment.classifier';
import { OutscraperService } from '../scrape/outscraper.service';
import { AttributionMatcher } from './attribution.matcher';
import { AttributionProducer } from './attribution.producer';

@Injectable()
export class AttributionProcessor {
  private readonly logger = new Logger(AttributionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outscraper: OutscraperService,
    private readonly matcher: AttributionMatcher,
    private readonly producer: AttributionProducer,
    private readonly sentiment: SentimentClassifier,
  ) {}

  /** Pull the location's current Google reviews, insert any newly-seen ones,
   *  then run the matcher. Reuses the baseline fetch + diff-by-externalId. */
  async runIncrementalSync(locationId: string): Promise<void> {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, deletedAt: null },
      select: { id: true, googlePlaceId: true },
    });
    if (!location?.googlePlaceId) {
      this.logger.warn(`Skip incremental sync: ${locationId} has no googlePlaceId`);
      return;
    }

    const sync = await this.prisma.reviewSync.create({
      data: {
        locationId,
        syncType: 'incremental',
        triggeredBy: 'cron',
        status: 'running',
      },
    });

    try {
      const result = await this.outscraper.fetchAllReviews(location.googlePlaceId);
      let reviewsAdded = 0;
      if (result.reviews.length > 0) {
        const existing = await this.prisma.googleReview.findMany({
          where: { locationId, externalId: { in: result.reviews.map((r) => r.externalId) } },
          select: { externalId: true, ownerReplyText: true },
        });
        const existingByExt = new Map(existing.map((e) => [e.externalId, e]));

        const fresh = result.reviews.filter((r) => !existingByExt.has(r.externalId));
        if (fresh.length > 0) {
          const { count } = await this.prisma.googleReview.createMany({
            data: fresh.map((r) => ({
              locationId,
              externalId: r.externalId,
              reviewerName: r.reviewerName,
              reviewerAvatarUrl: r.reviewerAvatarUrl,
              rating: r.rating,
              text: r.text,
              language: r.language,
              postedAt: r.postedAt,
              ownerReplyText: r.ownerReplyText,
              ownerRepliedAt: r.ownerRepliedAt,
              firstSeenInSyncId: sync.id,
            })),
            skipDuplicates: true,
          });
          reviewsAdded = count;
        }

        // An owner reply may be added to a review we already have — reconcile it.
        const newlyReplied = result.reviews.filter(
          (r) => r.ownerReplyText && existingByExt.get(r.externalId)?.ownerReplyText !== r.ownerReplyText,
        );
        for (const r of newlyReplied) {
          await this.prisma.googleReview.updateMany({
            where: { locationId, externalId: r.externalId },
            data: { ownerReplyText: r.ownerReplyText, ownerRepliedAt: r.ownerRepliedAt },
          });
        }
      }

      await this.prisma.reviewSync.update({
        where: { id: sync.id },
        data: { status: 'completed', completedAt: new Date(), reviewsAdded },
      });

      await this.matcher.runForLocation(locationId);
      await this.sentiment.classifyStale(locationId);
      this.logger.log(
        `Incremental sync ${locationId}: +${reviewsAdded} reviews${result.stub ? ' (STUB)' : ''}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.reviewSync.update({
        where: { id: sync.id },
        data: { status: 'failed', completedAt: new Date(), errorMessage: message },
      });
      throw err;
    }
  }

  /** Daily backstop: enqueue a sync for every location that still has requests
   *  awaiting a posted-review match. */
  async runSweep(): Promise<void> {
    const rows = await this.prisma.reviewRequest.findMany({
      where: { deletedAt: null, googleAttributionStatus: 'pending_check' },
      distinct: ['locationId'],
      select: { locationId: true },
    });
    for (const r of rows) {
      await this.producer.enqueueSync(r.locationId);
    }
    this.logger.log(`Attribution sweep enqueued ${rows.length} location syncs`);
  }
}
