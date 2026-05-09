import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutscraperService } from './outscraper.service';

export type BaselineScrapePayload = {
  locationId: string;
};

@Injectable()
export class ScrapeProcessor {
  private readonly logger = new Logger(ScrapeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outscraper: OutscraperService,
  ) {}

  async runBaseline({ locationId }: BaselineScrapePayload): Promise<void> {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, googlePlaceId: true, baselineScrapedAt: true },
    });

    if (!location) {
      this.logger.warn(`Skip baseline-scrape: location ${locationId} not found`);
      return;
    }
    if (!location.googlePlaceId) {
      this.logger.warn(`Skip baseline-scrape: ${locationId} has no googlePlaceId`);
      return;
    }
    if (location.baselineScrapedAt) {
      this.logger.log(`Skip baseline-scrape: ${locationId} already baselined`);
      return;
    }

    const sync = await this.prisma.reviewSync.create({
      data: {
        locationId,
        syncType: 'baseline',
        triggeredBy: 'on_demand',
        status: 'running',
      },
    });

    try {
      const result = await this.outscraper.fetchAllReviews(location.googlePlaceId);

      await this.prisma.googleReviewSnapshot.create({
        data: {
          locationId,
          syncedAt: new Date(),
          totalCount: result.totalCount,
          averageRating: result.averageRating,
          distribution: result.distribution,
          isBaseline: true,
        },
      });

      if (result.reviews.length > 0) {
        await this.prisma.googleReview.createMany({
          data: result.reviews.map((r) => ({
            locationId,
            externalId: r.externalId,
            reviewerName: r.reviewerName,
            reviewerAvatarUrl: r.reviewerAvatarUrl,
            rating: r.rating,
            text: r.text,
            language: r.language,
            postedAt: r.postedAt,
            firstSeenInSyncId: sync.id,
          })),
          skipDuplicates: true,
        });
      }

      await this.prisma.$transaction([
        this.prisma.location.update({
          where: { id: locationId },
          data: { baselineScrapedAt: new Date() },
        }),
        this.prisma.reviewSync.update({
          where: { id: sync.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            reviewsAdded: result.reviews.length,
          },
        }),
      ]);

      this.logger.log(
        `Baseline-scrape done for ${locationId}: ${result.reviews.length} reviews${result.stub ? ' (STUB)' : ''}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.reviewSync.update({
        where: { id: sync.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: message,
        },
      });
      throw err;
    }
  }
}
