'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import type { InvitationAccepted } from '@rater/types';
import { meQueryKey } from './use-me';

export function useAcceptInvitation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      apiPost<InvitationAccepted>(
        `/invitations/by-token/${encodeURIComponent(token)}/accept`,
        {},
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meQueryKey });
      router.push('/dashboard');
    },
  });
}
