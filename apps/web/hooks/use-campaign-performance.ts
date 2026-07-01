'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { CampaignPerformanceResponse } from '@rater/types';

export const campaignPerformanceQueryKey = (locationId: string) =>
  ['campaign-performance', locationId] as const;

export function useCampaignPerformance(locationId: string) {
  return useQuery({
    queryKey: campaignPerformanceQueryKey(locationId),
    queryFn: () =>
      apiGet<CampaignPerformanceResponse>(
        `/analytics/campaigns?locationId=${encodeURIComponent(locationId)}`,
      ),
    enabled: !!locationId,
  });
}
