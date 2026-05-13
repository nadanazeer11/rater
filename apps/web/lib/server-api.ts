import { createClient } from '@/lib/supabase/server';
import { ApiClientError, toApiClientError } from '@/lib/api-error';
import type {
  CampaignDetail,
  InvitationDetails,
  PublicReviewRequest,
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

/** A single campaign with its steps. Returns null on 404. Used by the
 *  SSR detail page for `notFound()` before the editor mounts. */
export async function fetchCampaign(id: string): Promise<CampaignDetail | null> {
  const res = await authedFetch(`/campaigns/${encodeURIComponent(id)}`);
  if (!res) return null;
  if (res.status === 404) return null;
  if (!res.ok) throw await toApiClientError(res);
  return (await res.json()) as CampaignDetail;
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
