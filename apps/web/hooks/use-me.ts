'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { MeResponse } from '@rater/types';

export const meQueryKey = ['me'] as const;

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: () => apiGet<MeResponse>('/me'),
  });
}
