'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '@/lib/api';
import type { SenderSettings, UpdateSenderSettingsInput } from '@rater/types';

export const senderSettingsQueryKey = (locationId: string) =>
  ['sender-settings', locationId] as const;

export function useSenderSettings(locationId: string) {
  return useQuery({
    queryKey: senderSettingsQueryKey(locationId),
    queryFn: () =>
      apiGet<SenderSettings>(
        `/locations/${encodeURIComponent(locationId)}/sender-settings`,
      ),
    enabled: !!locationId,
  });
}

export function useUpdateSenderSettings(locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSenderSettingsInput) =>
      apiPatch<SenderSettings>(
        `/locations/${encodeURIComponent(locationId)}/sender-settings`,
        input,
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(senderSettingsQueryKey(locationId), data);
    },
  });
}
