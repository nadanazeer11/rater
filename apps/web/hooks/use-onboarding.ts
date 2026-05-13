'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '@/lib/api';
import type { OnboardingResult } from '@rater/types';
import type { LocationDraft } from '@/app/onboarding/location-step';
import { meQueryKey } from './use-me';

type Input = { businessName: string; locations: LocationDraft[] };

export function useOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Input) => apiPost<OnboardingResult>('/onboarding', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}
