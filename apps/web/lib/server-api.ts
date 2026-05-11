import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { ApiClientError, toApiClientError } from '@/lib/api-error';
import type {
  CustomerSummary,
  InvitationDetails,
  MeResponse,
  PublicReviewRequest,
  RequestSummary,
} from '@rater/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const TIMEOUT_MS = 15_000;

async function fetchWithTimeout(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const timedOut = e instanceof DOMException && e.name === 'TimeoutError';
    throw new ApiClientError({
      statusCode: timedOut ? 408 : 0,
      code: 'INTERNAL',
      message: timedOut ? 'The request timed out.' : 'Could not reach the server.',
      timestamp: new Date().toISOString(),
      path,
    });
  }
}

async function authedFetch(path: string): Promise<Response | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  return fetchWithTimeout(path, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
}

/**
 * Returns null when there's no Supabase session. Throws an ApiClientError when
 * the api is reachable but returns an error. Memoized per request (`cache`) so
 * the dashboard layout and its pages share one round-trip.
 */
export const fetchMe = cache(async (): Promise<MeResponse | null> => {
  const res = await authedFetch('/me');
  if (!res) return null;
  if (!res.ok) throw await toApiClientError(res);
  return (await res.json()) as MeResponse;
});

/** Customers for a location. Throws an ApiClientError on api errors (incl. 403
 *  if the signed-in user isn't a member of the location). */
export async function fetchCustomers(
  locationId: string,
): Promise<CustomerSummary[]> {
  const res = await authedFetch(
    `/customers?locationId=${encodeURIComponent(locationId)}`,
  );
  if (!res) return [];
  if (!res.ok) throw await toApiClientError(res);
  return (await res.json()) as CustomerSummary[];
}

/** Review requests for a location. Throws an ApiClientError on api errors. */
export async function fetchReviewRequests(
  locationId: string,
): Promise<RequestSummary[]> {
  const res = await authedFetch(
    `/review-requests?locationId=${encodeURIComponent(locationId)}`,
  );
  if (!res) return [];
  if (!res.ok) throw await toApiClientError(res);
  return (await res.json()) as RequestSummary[];
}

/**
 * Public lookup for the /rate/[token] page — no auth. Returns null on 404
 * (invalid/expired token). Throws an ApiClientError on other api errors.
 */
export async function fetchReviewRequestByToken(
  token: string,
): Promise<PublicReviewRequest | null> {
  const res = await fetchWithTimeout(
    `/review-requests/by-token/${encodeURIComponent(token)}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw await toApiClientError(res);
  return (await res.json()) as PublicReviewRequest;
}

/**
 * Public lookup — no auth required. Returns null on 404 (invalid token).
 * Throws an ApiClientError on other api errors.
 */
export async function fetchInvitation(
  token: string,
): Promise<InvitationDetails | null> {
  const res = await fetchWithTimeout(
    `/invitations/by-token/${encodeURIComponent(token)}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw await toApiClientError(res);
  return (await res.json()) as InvitationDetails;
}
