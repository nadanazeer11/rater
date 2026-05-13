'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiPatch } from '@/lib/api';
import type { CampaignDetail, CampaignStepInput } from '@rater/types';

type Input = { name: string; steps: CampaignStepInput[] };

export function useUpdateCampaign(id: string) {
  const router = useRouter();
  return useMutation({
    mutationFn: (input: Input) =>
      apiPatch<CampaignDetail>(`/campaigns/${encodeURIComponent(id)}`, input),
    onSuccess: () => router.refresh(),
  });
}
