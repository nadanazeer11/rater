import type { AttributionConfidence, PendingAttributionMatch } from '@rater/types';

type PendingRow = {
  id: string;
  reviewerName: string;
  rating: number;
  text: string | null;
  postedAt: Date;
  attributionConfidence: AttributionConfidence | null;
  attributedReviewRequest: {
    id: string;
    customer: { name: string | null; email: string };
  } | null;
};

export function toPendingMatch(row: PendingRow): PendingAttributionMatch {
  return {
    reviewId: row.id,
    reviewerName: row.reviewerName,
    rating: row.rating,
    text: row.text,
    postedAt: row.postedAt.toISOString(),
    // These rows are tentative matches, so confidence + request are present.
    confidence: row.attributionConfidence ?? 'low',
    request: {
      id: row.attributedReviewRequest?.id ?? '',
      customerName: row.attributedReviewRequest?.customer.name ?? null,
      customerEmail: row.attributedReviewRequest?.customer.email ?? '',
    },
  };
}
