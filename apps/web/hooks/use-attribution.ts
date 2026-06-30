'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';
import type { PendingAttributionMatch } from '@rater/types';

export const pendingMatchesQueryKey = (locationId: string) =>
  ['attribution-pending', locationId] as const;

export function usePendingMatches(locationId: string) {
  return useQuery({
    queryKey: pendingMatchesQueryKey(locationId),
    queryFn: () =>
      apiGet<PendingAttributionMatch[]>(
        `/attribution/pending?locationId=${encodeURIComponent(locationId)}`,
      ),
    enabled: !!locationId,
  });
}

export function useConfirmMatch(locationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) =>
      apiPost<{ ok: true }>(`/attribution/${encodeURIComponent(reviewId)}/confirm`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: pendingMatchesQueryKey(locationId) }),
  });
}

export function useRejectMatch(locationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) =>
      apiPost<{ ok: true }>(`/attribution/${encodeURIComponent(reviewId)}/reject`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: pendingMatchesQueryKey(locationId) }),
  });
}

export function useSyncNow(locationId: string) {
  return useMutation({
    mutationFn: () => apiPost<{ ok: true }>(`/attribution/sync`, { locationId }),
  });
}
