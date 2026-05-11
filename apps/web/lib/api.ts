import { createClient } from '@/lib/supabase/client';
import { toApiClientError } from '@/lib/api-error';

export { ApiClientError } from '@/lib/api-error';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await toApiClientError(res);
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) throw await toApiClientError(res);
  return res.json() as Promise<T>;
}

/** Fire-and-forget ping that the customer clicked through to Google. Uses
 *  `sendBeacon` so it survives the navigation that immediately follows. */
export function beaconRedirectedToGoogle(token: string): void {
  try {
    navigator.sendBeacon(
      `${API_URL}/review-requests/by-token/${encodeURIComponent(token)}/redirected`,
    );
  } catch {
    // best-effort — never block the redirect on this
  }
}
