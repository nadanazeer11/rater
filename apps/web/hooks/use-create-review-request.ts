'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '@/lib/api';
import type { ReviewRequestCreated } from '@rater/types';
import { requestsQueryKey } from './use-requests';
import { customersQueryKey } from './use-customers';

type Input = {
  locationId: string;
  campaignId?: string;
  customer: { name: string; email: string; phone?: string };
};

export function useCreateReviewRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Input) =>
      apiPost<ReviewRequestCreated>('/review-requests', input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: requestsQueryKey(input.locationId),
      });
      queryClient.invalidateQueries({
        queryKey: customersQueryKey(input.locationId),
      });
    },
  });
}
