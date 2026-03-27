import type { Session } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();
const refreshSessionMock = vi.fn();
const fetchMock = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      refreshSession: refreshSessionMock,
    },
  },
}));

function createSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: 'token-1',
    refresh_token: 'refresh-1',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'user-1',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    } as Session['user'],
    ...overrides,
  } as Session;
}

describe('apiFetch', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', 'http://127.0.0.1:4000');
    vi.stubGlobal('fetch', fetchMock);
    getSessionMock.mockReset();
    refreshSessionMock.mockReset();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('refreshes an about-to-expire session before sending the request', async () => {
    const expiringSession = createSession({
      access_token: 'stale-token',
      expires_at: Math.floor(Date.now() / 1000) + 10,
    });
    const refreshedSession = createSession({
      access_token: 'fresh-token',
      refresh_token: 'refresh-1',
    });

    getSessionMock.mockResolvedValue({ data: { session: expiringSession } });
    refreshSessionMock.mockResolvedValue({ data: { session: refreshedSession }, error: null });
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    const { apiFetch } = await import('./api');
    await apiFetch('/api/company/bootstrap', { method: 'POST' });

    expect(refreshSessionMock).toHaveBeenCalledWith({ refresh_token: 'refresh-1' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:4000/api/company/bootstrap',
      expect.objectContaining({ method: 'POST', headers: expect.any(Headers) }),
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer fresh-token');
  });

  it('retries once with a refreshed token after a 401 response', async () => {
    const currentSession = createSession({ access_token: 'token-1' });
    const refreshedSession = createSession({ access_token: 'token-2' });

    getSessionMock.mockResolvedValue({ data: { session: currentSession } });
    refreshSessionMock.mockResolvedValue({ data: { session: refreshedSession }, error: null });
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const { apiFetch } = await import('./api');
    await apiFetch('/api/company/me');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(refreshSessionMock).toHaveBeenCalledWith({ refresh_token: 'refresh-1' });

    const [, firstInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [, secondInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect((firstInit.headers as Headers).get('Authorization')).toBe('Bearer token-1');
    expect((secondInit.headers as Headers).get('Authorization')).toBe('Bearer token-2');
  });
});
