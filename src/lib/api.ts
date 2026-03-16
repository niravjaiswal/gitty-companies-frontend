import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL as string;

/**
 * Auth-aware fetch wrapper. Automatically attaches the Supabase JWT
 * as a Bearer token and prepends the API base URL.
 */
export async function apiFetch(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(options?.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  return fetch(`${API_URL}${path}`, { ...options, headers });
}

/**
 * Builds a WebSocket URL with the auth token as a query parameter.
 * Returns a `ws://` or `wss://` URL matching the API_URL protocol.
 */
export async function getWebSocketUrl(path: string): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const httpUrl = new URL(`${API_URL}${path}`);
  httpUrl.protocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:';

  if (session?.access_token) {
    httpUrl.searchParams.set('token', session.access_token);
  }

  return httpUrl.toString();
}
