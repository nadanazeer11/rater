'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import type { LocationResponse } from '@rater/types';
import type { LocationDraft } from '@/app/onboarding/location-step';
import { meQueryKey } from './use-me';

export function useAddLocation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (loc: LocationDraft) => apiPost<LocationResponse>('/locations', loc),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: meQueryKey });
      router.replace(`/dashboard?location=${created.id}`);
    },
  });
}
