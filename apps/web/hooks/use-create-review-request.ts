'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import type { ReviewRequestCreated } from '@rater/types';

type Input = {
  locationId: string;
  customer: { name: string; email: string; phone?: string };
};

export function useCreateReviewRequest() {
  const router = useRouter();
  return useMutation({
    mutationFn: (input: Input) =>
      apiPost<ReviewRequestCreated>('/review-requests', input),
    onSuccess: () => router.refresh(),
  });
}
