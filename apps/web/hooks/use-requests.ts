'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { RequestSummary } from '@rater/types';

export const requestsQueryKey = (locationId: string) =>
  ['requests', locationId] as const;

export function useRequests(locationId: string) {
  return useQuery({
    queryKey: requestsQueryKey(locationId),
    queryFn: () =>
      apiGet<RequestSummary[]>(
        `/review-requests?locationId=${encodeURIComponent(locationId)}`,
      ),
    enabled: !!locationId,
  });
}
