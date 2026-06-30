'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { FunnelResponse, OverviewStats } from '@rater/types';

export const overviewQueryKey = (locationId: string) =>
  ['analytics', 'overview', locationId] as const;

export function useOverview(locationId: string) {
  return useQuery({
    queryKey: overviewQueryKey(locationId),
    queryFn: () =>
      apiGet<OverviewStats>(
        `/analytics/overview?locationId=${encodeURIComponent(locationId)}`,
      ),
    enabled: !!locationId,
  });
}

export interface FunnelFilters {
  from?: string;
  to?: string;
  campaignId?: string;
}

export const funnelQueryKey = (locationId: string, filters: FunnelFilters = {}) =>
  ['analytics', 'funnel', locationId, filters] as const;

export function useFunnel(locationId: string, filters: FunnelFilters = {}) {
  return useQuery({
    queryKey: funnelQueryKey(locationId, filters),
    queryFn: () => {
      const params = new URLSearchParams({ locationId });
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.campaignId) params.set('campaignId', filters.campaignId);
      return apiGet<FunnelResponse>(`/analytics/funnel?${params.toString()}`);
    },
    enabled: !!locationId,
  });
}
