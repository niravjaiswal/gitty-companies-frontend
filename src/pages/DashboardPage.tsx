import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  has_used_session?: boolean;
  session_ended_reason?: string;
}

interface SessionInfo {
  id: string;
  status: 'pending' | 'active' | 'completed' | 'expired';
  started_at?: string;
  ended_at?: string;
  end_reason?: string;
  duration_seconds?: number;
}

type DashboardState =
  | { kind: 'loading' }
  | { kind: 'fresh' }
  | { kind: 'active'; session: SessionInfo }
  | { kind: 'complete'; session: SessionInfo }
  | { kind: 'error'; message: string };

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<DashboardState>({ kind: 'loading' });
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [profileRes, sessionsRes] = await Promise.all([
          apiFetch('/api/profile'),
          apiFetch('/api/sessions/me'),
        ]);

        if (cancelled) return;

        if (!profileRes.ok && profileRes.status !== 404) {
          throw new Error('Failed to load profile');
        }

        if (!sessionsRes.ok && sessionsRes.status !== 404) {
          throw new Error('Failed to load sessions');
        }

        const profileData: Profile | null = profileRes.ok
          ? await profileRes.json()
          : null;

        const sessionData: SessionInfo | null = sessionsRes.ok
          ? await sessionsRes.json()
          : null;

        // If there's an active session, auto-navigate to it
        if (sessionData) {
          if (sessionData.status === 'active' || sessionData.status === 'pending') {
            navigate(`/session/${sessionData.id}`, { replace: true });
            return;
          }

          if (sessionData.status === 'completed' || sessionData.status === 'expired') {
            setState({ kind: 'complete', session: sessionData });
            return;
          }
        }

        // No active session — check if user already used their session
        if (profileData?.has_used_session) {
          // Fetch the most recent session from history for details
          let lastSession: SessionInfo | undefined;
          try {
            const historyRes = await apiFetch('/api/sessions/history');
            if (historyRes.ok) {
              const history = await historyRes.json();
              if (history.length > 0) {
                const s = history[0];
                lastSession = {
                  id: s.id,
                  status: 'completed',
                  started_at: s.createdAt,
                  ended_at: s.stoppedAt,
                  end_reason: profileData.session_ended_reason,
                };
              }
            }
          } catch {
            // History fetch failed — show completion without details
          }

          setState({
            kind: 'complete',
            session: lastSession ?? {
              id: '',
              status: 'completed',
              end_reason: profileData.session_ended_reason,
            },
          });
          return;
        }

        setState({ kind: 'fresh' });
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: 'error',
            message: err instanceof Error ? err.message : 'Something went wrong',
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleStart = useCallback(async () => {
    setIsStarting(true);
    try {
      const res = await apiFetch('/api/sessions', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create session');
      const data = await res.json();
      navigate(`/session/${data.id}`);
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to start assessment',
      });
      setIsStarting(false);
    }
  }, [navigate]);

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <h1 className="text-lg font-semibold">Candidate Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/50">{user?.email}</span>
          <button
            onClick={signOut}
            className="text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        {state.kind === 'loading' && (
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        )}

        {state.kind === 'error' && (
          <div className="text-center space-y-4 max-w-md">
            <div className="text-red-400 text-lg">Something went wrong</div>
            <p className="text-white/50 text-sm">{state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {state.kind === 'fresh' && (
          <div className="text-center space-y-6 max-w-md">
            <div>
              <h2 className="text-2xl font-bold mb-2">Technical Assessment</h2>
              <p className="text-white/50 text-sm">
                You will be given a coding challenge to complete in a sandboxed
                IDE environment. Once you start, the timer begins and cannot be
                paused.
              </p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-left">
              <p className="text-yellow-300 text-sm font-medium mb-1">
                Before you begin
              </p>
              <ul className="text-yellow-200/70 text-xs space-y-1 list-disc list-inside">
                <li>Make sure you have a stable internet connection</li>
                <li>This is a single-use assessment — once started, it cannot be restarted</li>
                <li>Closing the tab will not stop the timer</li>
              </ul>
            </div>
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
            >
              {isStarting ? 'Starting...' : 'Start Assessment'}
            </button>
          </div>
        )}

        {state.kind === 'complete' && (
          <div className="text-center space-y-6 max-w-md">
            <div>
              <h2 className="text-2xl font-bold mb-2">Assessment Complete</h2>
              <p className="text-white/50 text-sm">
                Thank you for completing the assessment. Your submission is being
                reviewed.
              </p>
            </div>
            <div className="bg-[#111116] border border-white/10 rounded-lg p-6 text-left space-y-3">
              {state.session.started_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Started</span>
                  <span>{new Date(state.session.started_at).toLocaleString()}</span>
                </div>
              )}
              {state.session.ended_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Ended</span>
                  <span>{new Date(state.session.ended_at).toLocaleString()}</span>
                </div>
              )}
              {state.session.duration_seconds != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Duration</span>
                  <span>{formatDuration(state.session.duration_seconds)}</span>
                </div>
              )}
              {state.session.end_reason && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Reason</span>
                  <span className="capitalize">{state.session.end_reason}</span>
                </div>
              )}
            </div>
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
            >
              {isStarting ? 'Starting...' : 'Start New Assessment'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
