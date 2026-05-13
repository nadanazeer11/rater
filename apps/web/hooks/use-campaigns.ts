'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { CampaignSummary } from '@rater/types';

export const campaignsQueryKey = (locationId: string) =>
  ['campaigns', locationId] as const;

export function useCampaigns(locationId: string) {
  return useQuery({
    queryKey: campaignsQueryKey(locationId),
    queryFn: () =>
      apiGet<CampaignSummary[]>(
        `/campaigns?locationId=${encodeURIComponent(locationId)}`,
      ),
    enabled: !!locationId,
  });
}
