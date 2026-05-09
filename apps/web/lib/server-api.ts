import { createClient } from '@/lib/supabase/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type MeResponse = {
  id: string;
  email: string;
  onboarded: boolean;
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
