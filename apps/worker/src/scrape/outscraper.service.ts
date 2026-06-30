import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { type AxiosInstance } from 'axios';
import { createHash } from 'node:crypto';

export type FetchedReview = {
  externalId: string;
  reviewerName: string;
  reviewerAvatarUrl: string | null;
  rating: number;
  text: string | null;
  language: string | null;
  postedAt: Date;
  ownerReplyText: string | null;
  ownerRepliedAt: Date | null;
};

export type FetchResult = {
  reviews: FetchedReview[];
  totalCount: number;
  averageRating: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
  stub: boolean;
};

const OUTSCRAPER_BASE = 'https://api.app.outscraper.com';
const STUB_KEY_VALUES = ['', 'stub', 'placeholder', 'todo'];

@Injectable()
export class OutscraperService {
  private readonly logger = new Logger(OutscraperService.name);
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    this.http = axios.create({ baseURL: OUTSCRAPER_BASE, timeout: 30_000 });
  }

  async fetchAllReviews(placeId: string): Promise<FetchResult> {
    const apiKey = (this.config.get<string>('OUTSCRAPER_API_KEY') ?? '').trim();

    if (STUB_KEY_VALUES.includes(apiKey.toLowerCase())) {
      this.logger.warn(
        `OUTSCRAPER_API_KEY is unset/stub — returning fake reviews for ${placeId}`,
      );
      return this.stubData(placeId);
    }

    return this.realFetch(placeId, apiKey);
  }

  private stubData(placeId: string): FetchResult {
    const seed = createHash('sha256').update(placeId).digest();
    const reviews: FetchedReview[] = Array.from({ length: 5 }).map((_, i) => {
      const r = ((seed[i] ?? 0) % 5) + 1;
      const days = ((seed[i + 1] ?? 0) % 365) + 1;
      const postedAt = new Date(Date.now() - days * 86_400_000);
      const externalId = createHash('sha256')
        .update(`${placeId}:${i}`)
        .digest('hex')
        .slice(0, 24);
      // Give a couple of stub reviews an owner reply so the reply pipeline has data.
      const replied = i % 2 === 0;
      return {
        externalId,
        reviewerName: `Stub Reviewer ${i + 1}`,
        reviewerAvatarUrl: null,
        rating: r,
        text: `Stub review #${i + 1} for testing the queue pipeline.`,
        language: 'en',
        postedAt,
        ownerReplyText: replied ? `Thanks for the feedback, Stub Reviewer ${i + 1}!` : null,
        ownerRepliedAt: replied ? new Date(postedAt.getTime() + 86_400_000) : null,
      };
    });

    const distribution: FetchResult['distribution'] = {
      '1': 0, '2': 0, '3': 0, '4': 0, '5': 0,
    };
    let sum = 0;
    for (const r of reviews) {
      distribution[String(r.rating) as keyof FetchResult['distribution']] += 1;
      sum += r.rating;
    }

    return {
      reviews,
      totalCount: reviews.length,
      averageRating: sum / reviews.length,
      distribution,
      stub: true,
    };
  }

  private async realFetch(
    placeId: string,
    apiKey: string,
  ): Promise<FetchResult> {
    const headers = { 'X-API-KEY': apiKey };

    const start = await this.http.get('/maps/reviews-v3', {
      params: { query: placeId, reviewsLimit: 0, async: true },
      headers,
    });

    const requestId =
      (start.data?.id as string | undefined) ??
      (start.data?.results_location as string | undefined);
    if (!requestId) {
      throw new Error(
        `Outscraper start did not return a request id: ${JSON.stringify(start.data)}`,
      );
    }

    const resultsUrl = requestId.startsWith('http')
      ? requestId
      : `${OUTSCRAPER_BASE}/requests/${requestId}`;

    const deadline = Date.now() + 10 * 60_000;
    let payload: unknown = null;

    while (Date.now() < deadline) {
      const res = await this.http.get(resultsUrl, { headers });
      const status = res.data?.status as string | undefined;
      if (status === 'Success' || res.data?.data) {
        payload = res.data?.data ?? res.data;
        break;
      }
      if (status === 'Failed') {
        throw new Error(
          `Outscraper job failed: ${JSON.stringify(res.data)}`,
        );
      }
      await new Promise((r) => setTimeout(r, 5_000));
    }

    if (!payload) {
      throw new Error('Outscraper polling timed out after 10 minutes');
    }

    return this.parseOutscraperResponse(payload);
  }

  private parseOutscraperResponse(raw: unknown): FetchResult {
    const arr = Array.isArray(raw) ? raw : [raw];
    const place = Array.isArray(arr[0]) ? arr[0][0] : arr[0];

    const reviewsRaw = (place?.reviews_data ?? []) as Array<Record<string, unknown>>;
    const reviews: FetchedReview[] = reviewsRaw.map((r) => {
      const id =
        (r.review_id as string | undefined) ??
        createHash('sha256')
          .update(`${r.author_title ?? ''}:${r.review_text ?? ''}:${r.review_datetime_utc ?? ''}`)
          .digest('hex')
          .slice(0, 24);
      const ratingRaw = r.review_rating ?? r.rating ?? 0;
      const rating = Math.max(1, Math.min(5, Math.round(Number(ratingRaw))));
      const tsRaw =
        (r.review_datetime_utc as string | undefined) ??
        (r.review_timestamp as number | undefined);
      const postedAt = tsRaw
        ? new Date(typeof tsRaw === 'number' ? tsRaw * 1000 : tsRaw)
        : new Date();

      const replyText = (r.owner_answer as string | undefined)?.trim() || null;
      const replyTsRaw =
        (r.owner_answer_timestamp_datetime_utc as string | undefined) ??
        (r.owner_answer_timestamp as number | undefined);
      const ownerRepliedAt = replyText
        ? replyTsRaw
          ? new Date(typeof replyTsRaw === 'number' ? replyTsRaw * 1000 : replyTsRaw)
          : postedAt
        : null;

      return {
        externalId: id,
        reviewerName: (r.author_title as string | undefined) ?? 'Anonymous',
        reviewerAvatarUrl: (r.author_image as string | undefined) ?? null,
        rating,
        text: (r.review_text as string | undefined) ?? null,
        language: (r.review_lang as string | undefined) ?? null,
        postedAt,
        ownerReplyText: replyText,
        ownerRepliedAt,
      };
    });

    const distribution: FetchResult['distribution'] = {
      '1': 0, '2': 0, '3': 0, '4': 0, '5': 0,
    };
    let sum = 0;
    for (const r of reviews) {
      distribution[String(r.rating) as keyof FetchResult['distribution']] += 1;
      sum += r.rating;
    }

    const totalCount = (place?.reviews as number | undefined) ?? reviews.length;
    const averageRating =
      reviews.length > 0
        ? sum / reviews.length
        : (place?.rating as number | undefined) ?? 0;

    return { reviews, totalCount, averageRating, distribution, stub: false };
  }
}
