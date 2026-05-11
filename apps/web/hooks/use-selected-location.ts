'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { LocationSummary } from '@rater/types';

/**
 * Resolves the location from the `?location=<id>` search param against the
 * caller's list, with a `selectLocation` that swaps it on the *current* route
 * (soft navigation — no full reload, the dashboard shell stays mounted).
 */
export function useSelectedLocation(locations: LocationSummary[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locationParam = searchParams.get('location');

  const location =
    locations.find((l) => l.id === locationParam) ?? locations[0] ?? null;
  const canAddLocation = locations.some((l) => l.role === 'admin');

  const selectLocation = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('location', id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return { location, locations, canAddLocation, selectLocation };
}
