'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '@/lib/api';
import type { ImportRequestsResult } from '@rater/types';
import { requestsQueryKey } from './use-requests';
import { customersQueryKey } from './use-customers';

type Row = { email: string; name?: string; phone?: string };
type Input = { locationId: string; campaignId?: string; rows: Row[] };

export function useImportReviewRequests() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Input) =>
      apiPost<ImportRequestsResult>('/review-requests/import', input),
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
