'use client';

import { useMutation } from '@tanstack/react-query';
import { apiPost } from '@/lib/api';
import type { OnboardingResult } from '@rater/types';
import type { LocationDraft } from '@/app/onboarding/location-step';

type Input = { businessName: string; locations: LocationDraft[] };

export function useOnboarding() {
  return useMutation({
    mutationFn: (input: Input) => apiPost<OnboardingResult>('/onboarding', input),
  });
}
