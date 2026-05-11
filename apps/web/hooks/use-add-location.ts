'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import type { LocationResponse } from '@rater/types';
import type { LocationDraft } from '@/app/onboarding/location-step';

export function useAddLocation() {
  const router = useRouter();
  return useMutation({
    mutationFn: (loc: LocationDraft) => apiPost<LocationResponse>('/locations', loc),
    onSuccess: (created) => {
      router.replace(`/dashboard?location=${created.id}`);
      router.refresh();
    },
  });
}
