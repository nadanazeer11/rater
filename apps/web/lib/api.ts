import { createClient } from '@/lib/supabase/client';
import { ApiClientError, toApiClientError } from '@/lib/api-error';

export { ApiClientError } from '@/lib/api-error';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const TIMEOUT_MS = 15_000;

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
}

function networkError(path: string, timedOut: boolean): ApiClientError {
  return new ApiClientError({
    statusCode: timedOut ? 408 : 0,
    code: 'INTERNAL',
    message: timedOut
      ? 'The request timed out. Check your connection and try again.'
      : 'Could not reach the server. Check your connection and try again.',
    timestamp: new Date().toISOString(),
    path,
  });
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const headers = await authHeaders();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { ...(init.headers ?? {}), ...headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw networkError(path, e instanceof DOMException && e.name === 'TimeoutError');
  }
  if (!res.ok) throw await toApiClientError(res);
  return res.json() as Promise<T>;
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
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
