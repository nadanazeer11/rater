'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import type { CampaignDetail } from '@rater/types';

type Input = { locationId: string; name: string };

export function useCreateCampaign() {
  const router = useRouter();
  return useMutation({
    mutationFn: (input: Input) => apiPost<CampaignDetail>('/campaigns', input),
    onSuccess: (created) => {
      router.push(
        `/dashboard/campaigns/${created.id}?location=${created.locationId}`,
      );
      router.refresh();
    },
  });
}
