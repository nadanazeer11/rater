'use client';

import { useMutation } from '@tanstack/react-query';
import { apiPost } from '@/lib/api';
import type { InvitationCreated } from '@rater/types';

type Input = { locationId: string; email: string; role: 'member' | 'admin' };

export function useInviteTeammate() {
  return useMutation({
    mutationFn: (input: Input) => apiPost<InvitationCreated>('/invitations', input),
  });
}
