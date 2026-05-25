'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { GoogleReviewsPage, GoogleReviewsSort } from '@rater/types';

export interface GoogleReviewsParams {
  page: number;
  pageSize: number;
  search: string;
  rating: number | null;
  sort: GoogleReviewsSort;
}

export const googleReviewsQueryKey = (
  locationId: string,
  params: GoogleReviewsParams,
) => ['google-reviews', locationId, params] as const;

function buildQuery(locationId: string, params: GoogleReviewsParams): string {
  const sp = new URLSearchParams({ locationId });
  sp.set('page', String(params.page));
  sp.set('pageSize', String(params.pageSize));
  sp.set('sort', params.sort);
  if (params.search.trim()) sp.set('search', params.search.trim());
  if (params.rating !== null) sp.set('rating', String(params.rating));
  return sp.toString();
}

export function useGoogleReviews(
  locationId: string,
  params: GoogleReviewsParams,
) {
  return useQuery({
    queryKey: googleReviewsQueryKey(locationId, params),
    queryFn: () =>
      apiGet<GoogleReviewsPage>(`/google-reviews?${buildQuery(locationId, params)}`),
    enabled: !!locationId,
    placeholderData: keepPreviousData,
  });
}
