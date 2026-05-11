'use client';

import { useMutation } from '@tanstack/react-query';
import { apiPost } from '@/lib/api';
import type { RateResult } from '@rater/types';

export function useSubmitRating(token: string) {
  return useMutation({
    mutationFn: (rating: number) =>
      apiPost<RateResult>(
        `/review-requests/by-token/${encodeURIComponent(token)}/rate`,
        { rating },
      ),
  });
}

export function useSubmitFeedback(token: string) {
  return useMutation({
    mutationFn: (text: string) =>
      apiPost<void>(
        `/review-requests/by-token/${encodeURIComponent(token)}/feedback`,
        { text },
      ),
  });
}
