import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnthropicService } from './anthropic.service';

const DAY_MS = 86_400_000;
/** Re-classify a review at most this often. */
const REFRESH_AFTER_MS = 15 * DAY_MS;
/** Only ever classify the location's most recent N reviews (cost bound). */
const MAX_REVIEWS = 100;

@Injectable()
export class SentimentClassifier {
  private readonly logger = new Logger(SentimentClassifier.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
  ) {}

  /**
   * Classifies (or refreshes) sentiment for a location's most recent reviews.
   * Cached on the row: only rows never classified or stale (>15d) are touched,
   * and never more than the newest 100 — see docs/sentiment.md.
   */
  async classifyStale(locationId: string): Promise<number> {
    const staleBefore = new Date(Date.now() - REFRESH_AFTER_MS);
    const reviews = await this.prisma.googleReview.findMany({
      where: {
        locationId,
        removedAt: null,
        OR: [{ sentiment: null }, { sentimentClassifiedAt: { lt: staleBefore } }],
      },
      orderBy: { postedAt: 'desc' },
      take: MAX_REVIEWS,
      select: { id: true, text: true, rating: true },
    });
    if (reviews.length === 0) return 0;

    const result = await this.anthropic.classifySentiment(reviews);
    const now = new Date();
    for (const [id, sentiment] of result) {
      await this.prisma.googleReview.update({
        where: { id },
        data: { sentiment, sentimentClassifiedAt: now },
      });
    }
    this.logger.log(`Classified sentiment for ${result.size} reviews at ${locationId}`);
    return result.size;
  }
}
