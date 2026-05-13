'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiDelete } from '@/lib/api';

/** Archives the campaign. Caller wires the success snackbar + navigation —
 *  we don't auto-navigate so the snackbar has a chance to render. */
export function useArchiveCampaign(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiDelete(`/campaigns/${encodeURIComponent(id)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}
