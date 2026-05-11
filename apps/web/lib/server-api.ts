import { createClient } from '@/lib/supabase/server';

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
 * Throws when the api is reachable but returns an error.
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
  if (!res.ok) {
    throw new Error(`Failed to fetch /me: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as MeResponse;
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
 * Throws on other api errors.
 */
export async function fetchInvitation(
  token: string,
): Promise<InvitationDetails | null> {
  const res = await fetch(
    `${API_URL}/invitations/by-token/${encodeURIComponent(token)}`,
    { cache: 'no-store' },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to fetch invitation: ${res.status}`);
  }
  return (await res.json()) as InvitationDetails;
}
