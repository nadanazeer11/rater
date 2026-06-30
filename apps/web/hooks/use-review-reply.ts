'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';
import type { ReviewReplyDraft, ReviewsSummary } from '@rater/types';

export const reviewsSummaryQueryKey = (locationId: string) =>
  ['reviews-summary', locationId] as const;

export function useReviewsSummary(locationId: string) {
  return useQuery({
    queryKey: reviewsSummaryQueryKey(locationId),
    queryFn: () =>
      apiGet<ReviewsSummary>(
        `/google-reviews/summary?locationId=${encodeURIComponent(locationId)}`,
      ),
    enabled: !!locationId,
  });
}

export function useDraftReply() {
  return useMutation({
    mutationFn: (reviewId: string) =>
      apiPost<ReviewReplyDraft>(
        `/google-reviews/${encodeURIComponent(reviewId)}/draft-reply`,
        {},
      ),
  });
}
