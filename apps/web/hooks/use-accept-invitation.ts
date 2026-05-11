'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import type { InvitationAccepted } from '@rater/types';

export function useAcceptInvitation() {
  const router = useRouter();
  return useMutation({
    mutationFn: (token: string) =>
      apiPost<InvitationAccepted>(
        `/invitations/by-token/${encodeURIComponent(token)}/accept`,
        {},
      ),
    onSuccess: () => {
      router.push('/dashboard');
      router.refresh();
    },
  });
}
