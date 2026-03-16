import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';

interface IDELayoutProps {
  sessionId: string;
  codeServerUrl: string;
}

type ConnectionStatus = 'connected' | 'disconnecting' | 'ended';

/**
 * IDE layout that embeds code-server (VS Code in the browser) via iframe.
 * Sends heartbeats every 10s to keep the session alive.
 */
export default function IDELayout({ sessionId, codeServerUrl }: IDELayoutProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ConnectionStatus>('connected');
  const [sessionEnded, setSessionEnded] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Heartbeat: POST every 10s to keep session alive
  useEffect(() => {
    async function sendHeartbeat() {
      try {
        const res = await apiFetch(`/api/sessions/${sessionId}/heartbeat`, {
          method: 'POST',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status !== 'running') {
            setStatus('ended');
            setSessionEnded(true);
          } else {
            setStatus('connected');
          }
        } else {
          setStatus('disconnecting');
        }
      } catch {
        setStatus('disconnecting');
      }
    }

    // Send initial heartbeat
    sendHeartbeat();

    heartbeatRef.current = setInterval(sendHeartbeat, 10_000);
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [sessionId]);

  // beforeunload warning while in an active session
  useEffect(() => {
    if (sessionEnded) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [sessionEnded]);

  const handleReturnToDashboard = useCallback(() => {
    navigate('/candidate', { replace: true });
  }, [navigate]);

  return (
    <div className="h-full w-full bg-[#1e1e1e] overflow-hidden relative flex flex-col">
      {/* Status bar (30px) */}
      <div
        className={`h-[30px] shrink-0 flex items-center justify-center gap-2 px-3 text-xs ${
          status === 'connected'
            ? 'bg-[#007acc] text-white'
            : status === 'disconnecting'
              ? 'bg-yellow-600/90 text-yellow-100'
              : 'bg-red-600/90 text-red-100'
        }`}
      >
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            status === 'connected'
              ? 'bg-green-300'
              : status === 'disconnecting'
                ? 'bg-yellow-200 animate-pulse'
                : 'bg-red-200'
          }`}
        />
        {status === 'connected'
          ? 'Connected'
          : status === 'disconnecting'
            ? 'Connection lost — attempting to reconnect...'
            : 'Session ended'}
      </div>

      {/* code-server iframe */}
      <iframe
        src={codeServerUrl}
        title="VS Code"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
        allow="clipboard-read; clipboard-write"
        style={{
          width: '100%',
          height: 'calc(100% - 30px)',
          border: 'none',
        }}
      />

      {/* Session Ended overlay modal */}
      {sessionEnded && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111116] border border-white/10 rounded-2xl p-8 max-w-sm text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white">Session Ended</h2>
            <p className="text-white/50 text-sm">
              Your assessment session has ended. Thank you for completing the
              assessment.
            </p>
            <button
              onClick={handleReturnToDashboard}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-medium transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
