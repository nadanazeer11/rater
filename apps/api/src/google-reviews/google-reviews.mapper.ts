import type { GoogleReview } from '@rater/db';
import {
  GoogleReviewResponseDto,
  GoogleReviewsPageDto,
} from './dto/google-review.response';

export function toGoogleReviewResponse(r: GoogleReview): GoogleReviewResponseDto {
  return {
    id: r.id,
    externalId: r.externalId,
    reviewerName: r.reviewerName,
    reviewerAvatarUrl: r.reviewerAvatarUrl,
    rating: r.rating,
    text: r.text,
    language: r.language,
    postedAt: r.postedAt,
    ownerReplyText: r.ownerReplyText,
    ownerRepliedAt: r.ownerRepliedAt,
    attributedReviewRequestId: r.attributedReviewRequestId,
    attributionConfidence: r.attributionConfidence,
    createdAt: r.createdAt,
  };
}

export function toGoogleReviewsPage(
  items: GoogleReview[],
  total: number,
  page: number,
  pageSize: number,
): GoogleReviewsPageDto {
  return {
    items: items.map(toGoogleReviewResponse),
    total,
    page,
    pageSize,
  };
}
