import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL as string;
const TOKEN_REFRESH_BUFFER_SECONDS = 30;

async function refreshAuthSession(refreshToken: string): Promise<Session | null> {
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    return null;
  }

  return data.session;
}

async function getActiveSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  const expiresAt = session.expires_at ?? 0;
  const now = Math.floor(Date.now() / 1000);

  if (
    session.refresh_token &&
    expiresAt > 0 &&
    expiresAt <= now + TOKEN_REFRESH_BUFFER_SECONDS
  ) {
    return (await refreshAuthSession(session.refresh_token)) ?? session;
  }

  return session;
}

function withAuthHeaders(options: RequestInit | undefined, session: Session | null): RequestInit {
  const headers = new Headers(options?.headers);

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  return { ...options, headers };
}

/**
 * Auth-aware fetch wrapper. Automatically attaches the Supabase JWT
 * as a Bearer token and prepends the API base URL.
 */
export async function apiFetch(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const session = await getActiveSession();
  let response = await fetch(`${API_URL}${path}`, withAuthHeaders(options, session));

  if (response.status === 401 && session?.refresh_token) {
    const refreshedSession = await refreshAuthSession(session.refresh_token);
    if (refreshedSession?.access_token && refreshedSession.access_token !== session.access_token) {
      response = await fetch(`${API_URL}${path}`, withAuthHeaders(options, refreshedSession));
    }
  }

  return response;
}

/**
 * Builds a WebSocket URL with the auth token as a query parameter.
 * Returns a `ws://` or `wss://` URL matching the API_URL protocol.
 */
export async function getWebSocketUrl(path: string): Promise<string> {
  const session = await getActiveSession();

  const httpUrl = new URL(`${API_URL}${path}`);
  httpUrl.protocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:';

  if (session?.access_token) {
    httpUrl.searchParams.set('token', session.access_token);
  }

  return httpUrl.toString();
}
