'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { CustomerSummary } from '@rater/types';

export const customersQueryKey = (locationId: string) =>
  ['customers', locationId] as const;

export function useCustomers(locationId: string) {
  return useQuery({
    queryKey: customersQueryKey(locationId),
    queryFn: () =>
      apiGet<CustomerSummary[]>(
        `/customers?locationId=${encodeURIComponent(locationId)}`,
      ),
    enabled: !!locationId,
  });
}
