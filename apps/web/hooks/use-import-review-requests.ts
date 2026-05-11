'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import type { ImportRequestsResult } from '@rater/types';

type Row = { email: string; name?: string; phone?: string };
type Input = { locationId: string; rows: Row[] };

export function useImportReviewRequests() {
  const router = useRouter();
  return useMutation({
    mutationFn: (input: Input) =>
      apiPost<ImportRequestsResult>('/review-requests/import', input),
    onSuccess: () => router.refresh(),
  });
}
