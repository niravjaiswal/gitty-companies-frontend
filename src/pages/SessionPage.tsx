import { useState, useCallback, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import IDELayout from '@/components/IDE/IDELayout';
import { apiFetch } from '@/lib/api';

interface SessionDetail {
  id: string;
  status: string;
  codeServerUrl: string | null;
  assessment: {
    id: string;
    title: string;
    summary: string;
    instructionsMd: string;
    durationMinutes: number;
  } | null;
}

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);
  const [codeServerUrl, setCodeServerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch session data on mount to get codeServerUrl
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function fetchSession() {
      try {
        const res = await apiFetch(`/api/sessions/${id}`);
        if (cancelled) return;

        if (!res.ok) {
          navigate('/candidate', { replace: true });
          return;
        }

        const data = (await res.json()) as SessionDetail;
        if (data.status === 'stopped' || data.status === 'error' || data.status === 'timed_out' || data.status === 'abandoned') {
          navigate('/candidate', { replace: true });
          return;
        }

        setSessionDetail(data);

        if (data.codeServerUrl) {
          setCodeServerUrl(data.codeServerUrl);
          setLoading(false);
        } else {
          // Session is still starting — poll until code-server URL is available
          const poll = setInterval(async () => {
            try {
              const pollRes = await apiFetch(`/api/sessions/${id}`);
              if (cancelled) return;
              if (!pollRes.ok) return;
              const pollData = (await pollRes.json()) as SessionDetail;
              if (pollData.codeServerUrl) {
                setSessionDetail(pollData);
                setCodeServerUrl(pollData.codeServerUrl);
                setLoading(false);
                clearInterval(poll);
              }
            } catch {
              // Retry on next interval
            }
          }, 2000);

          // Clean up polling on unmount
          const cleanup = () => clearInterval(poll);
          return cleanup;
        }
      } catch {
        if (!cancelled) {
          navigate('/candidate', { replace: true });
        }
      }
    }

    const cleanupPromise = fetchSession();
    return () => {
      cancelled = true;
      cleanupPromise?.then?.((cleanup) => cleanup?.());
    };
  }, [id, navigate]);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  if (!id) {
    return <Navigate to="/candidate" replace />;
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <div className="glass border-b border-border/50 h-14 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <span className="font-display text-sm text-foreground tracking-wider">TECHASSESS</span>
          <span className="w-px h-5 bg-border" />
          <span className="text-sm text-muted-foreground font-sans">Technical Assessment</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-display text-xs text-muted-foreground">Q</span>
            <span className="font-display text-sm text-foreground">Live</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-display text-sm text-foreground">{formatTime(elapsed)}</span>
          </div>
        </div>
      </div>

      {/* Split panes */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={40} minSize={25}>
          <div className="h-full overflow-y-auto p-8">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 rounded-full glass text-xs font-display text-primary">
                  Assessment Brief
                </span>
                <span className="px-3 py-1 rounded-full glass text-xs font-display text-muted-foreground">
                  {sessionDetail?.assessment?.durationMinutes ?? '--'} min
                </span>
              </div>
              <h2 className="font-display text-2xl text-foreground mb-3">
                {sessionDetail?.assessment?.title ?? 'Technical Assessment'}
              </h2>
              {sessionDetail?.assessment?.summary && (
                <p className="mb-6 text-sm leading-7 text-muted-foreground">
                  {sessionDetail.assessment.summary}
                </p>
              )}
              <div className="prose prose-invert prose-sm max-w-none font-sans">
                {(sessionDetail?.assessment?.instructionsMd ?? 'Assessment instructions are loading.')
                  .split('\n')
                  .map((line, i) => {
                  if (line.startsWith('## '))
                    return (
                      <h2 key={i} className="font-display text-lg text-foreground mt-6 mb-3">
                        {line.replace('## ', '')}
                      </h2>
                    );
                  if (line.startsWith('### '))
                    return (
                      <h3 key={i} className="font-display text-base text-foreground mt-4 mb-2">
                        {line.replace('### ', '')}
                      </h3>
                    );
                  if (line.startsWith('```'))
                    return (
                      <div key={i} className="glass rounded-lg p-4 font-mono text-xs text-foreground my-3">
                        {line.replace(/```\w*/, '')}
                      </div>
                    );
                  if (line.startsWith('- '))
                    return (
                      <li key={i} className="text-muted-foreground ml-4 mb-1">
                        {line.replace('- ', '')}
                      </li>
                    );
                  if (line.trim() === '') return <br key={i} />;
                  return (
                    <p key={i} className="text-muted-foreground mb-2">
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className="w-1 bg-border/50 hover:bg-primary/30 liquid-transition data-[resize-handle-active]:bg-primary/50"
        />

        <ResizablePanel defaultSize={60} minSize={30}>
          {loading ? (
            <div className="h-full w-full flex flex-col items-center justify-center bg-[#1e1e1e] gap-4">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-white/50 text-sm">Setting up your development environment...</p>
            </div>
          ) : (
            <IDELayout sessionId={id} codeServerUrl={codeServerUrl!} />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
