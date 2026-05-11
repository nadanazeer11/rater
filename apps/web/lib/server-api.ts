import { createClient } from '@/lib/supabase/server';
import { toApiClientError } from '@/lib/api-error';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type LocationSummary = {
  id: string;
  name: string;
  role: string;
  business: { id: string; name: string };
  googleRating: number | null;
  googleReviewsCount: number | null;
  googleAddress: string | null;
  baselineScrapedAt: string | null;
  createdAt: string;
};

export type MeResponse = {
  id: string;
  email: string;
  onboarded: boolean;
  locations: LocationSummary[];
};

/**
 * Returns null when there's no Supabase session.
 * Throws an ApiClientError when the api is reachable but returns an error.
 */
export async function fetchMe(): Promise<MeResponse | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const res = await fetch(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw await toApiClientError(res);
  return (await res.json()) as MeResponse;
}

export type CustomerSummary = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  emailStatus: string;
  importSource: string;
  importedAt: string;
  createdAt: string;
};

/** Customers for a location. Throws an ApiClientError on api errors (incl. 403
 *  if the signed-in user isn't a member of the location). */
export async function fetchCustomers(
  locationId: string,
): Promise<CustomerSummary[]> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const res = await fetch(
    `${API_URL}/customers?locationId=${encodeURIComponent(locationId)}`,
    {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    },
  );
  if (!res.ok) throw await toApiClientError(res);
  return (await res.json()) as CustomerSummary[];
}

export type InvitationDetails = {
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expiresAt: string;
  location: { id: string; name: string; businessName: string };
  invitedBy: { email: string; name: string | null } | null;
};

/**
 * Public lookup — no auth required. Returns null on 404 (invalid token).
 * Throws an ApiClientError on other api errors.
 */
export async function fetchInvitation(
  token: string,
): Promise<InvitationDetails | null> {
  const res = await fetch(
    `${API_URL}/invitations/by-token/${encodeURIComponent(token)}`,
    { cache: 'no-store' },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw await toApiClientError(res);
  return (await res.json()) as InvitationDetails;
}
