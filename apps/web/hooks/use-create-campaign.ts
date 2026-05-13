'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import type { CampaignDetail } from '@rater/types';
import { campaignsQueryKey } from './use-campaigns';

type Input = { locationId: string; name: string };

export function useCreateCampaign() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Input) => apiPost<CampaignDetail>('/campaigns', input),
    onSuccess: (created) => {
      queryClient.invalidateQueries({
        queryKey: campaignsQueryKey(created.locationId),
      });
      router.push(
        `/dashboard/campaigns/${created.id}?location=${created.locationId}`,
      );
    },
  });
}
