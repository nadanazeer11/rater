'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { SentimentTrend } from '@rater/types';

export const sentimentTrendQueryKey = (locationId: string, months: number) =>
  ['sentiment-trend', locationId, months] as const;

export function useSentimentTrend(locationId: string, months = 6) {
  return useQuery({
    queryKey: sentimentTrendQueryKey(locationId, months),
    queryFn: () =>
      apiGet<SentimentTrend>(
        `/analytics/sentiment-trend?locationId=${encodeURIComponent(locationId)}&months=${months}`,
      ),
    enabled: !!locationId,
  });
}
