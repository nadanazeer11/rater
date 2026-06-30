'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { RequestTimeline } from '@rater/types';

export const requestTimelineQueryKey = (id: string) =>
  ['request-timeline', id] as const;

/** Fetches one request's activity log. `enabled` is gated on `id` so it only
 *  fires when the drawer is actually open for a request. */
export function useRequestTimeline(id: string | null) {
  return useQuery({
    queryKey: requestTimelineQueryKey(id ?? ''),
    queryFn: () =>
      apiGet<RequestTimeline>(
        `/review-requests/${encodeURIComponent(id ?? '')}/timeline`,
      ),
    enabled: !!id,
  });
}
