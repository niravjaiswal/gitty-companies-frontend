import { useState, useCallback, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
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
    workspaceEntryFile: string | null;
    workspaceGeneratedAt: string | null;
    workspaceFileCount: number;
  } | null;
}

const quickCommands = [
  'npm install',
  'npm run dev -- --host 0.0.0.0 --port 3000',
  'npm run test',
];

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);
  const [codeServerUrl, setCodeServerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  const handleSubmit = useCallback(async () => {
    if (!id || submitting) return;
    setShowConfirm(false);
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/sessions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSubmitted(true);
      } else {
        console.error('Submit failed:', res.status, await res.text().catch(() => ''));
      }
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setSubmitting(false);
    }
  }, [id, submitting]);

  if (!id) {
    return <Navigate to="/candidate" replace />;
  }

  if (submitted) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="font-display text-2xl text-foreground mb-2">Assessment Submitted</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your work has been recorded successfully. You can safely close this window or return to the dashboard.
            </p>
          </div>
          <Button onClick={() => navigate('/candidate')} size="lg">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
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
          <Button size="sm" disabled={submitting} onClick={() => setShowConfirm(true)}>
            {submitting ? 'Submitting...' : 'Submit Assessment'}
          </Button>
          <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit your assessment?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will end your session and submit all your work for review. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button onClick={handleSubmit}>Submit</Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
              {sessionDetail?.assessment && sessionDetail.assessment.workspaceFileCount > 0 && (
                <p className="mb-6 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  {sessionDetail.assessment.workspaceFileCount} starter files loaded
                  {sessionDetail.assessment.workspaceEntryFile
                    ? `, opening ${sessionDetail.assessment.workspaceEntryFile}`
                    : ''}
                </p>
              )}
              <div className="mb-6 grid gap-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">Workspace</p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    The IDE opens directly in the assessment folder. Use the built-in terminal to run the project and tests before you submit.
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">Quick commands</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickCommands.map((command) => (
                      <code
                        key={command}
                        className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] text-white/78"
                      >
                        {command}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
              <div className="prose prose-invert prose-sm max-w-none font-sans">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="font-display text-xl text-foreground mt-6 mb-3">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="font-display text-lg text-foreground mt-6 mb-3">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="font-display text-base text-foreground mt-4 mb-2">{children}</h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-sm leading-6 text-muted-foreground mb-2">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-5 my-2 space-y-1 text-muted-foreground">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-5 my-2 space-y-1 text-muted-foreground">{children}</ol>
                    ),
                    li: ({ children }) => <li className="text-sm leading-6">{children}</li>,
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-primary underline underline-offset-2 hover:text-primary/80"
                      >
                        {children}
                      </a>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-foreground">{children}</strong>
                    ),
                    em: ({ children }) => <em className="italic">{children}</em>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-white/20 pl-4 my-3 text-muted-foreground italic">
                        {children}
                      </blockquote>
                    ),
                    hr: () => <hr className="my-6 border-white/10" />,
                    pre: ({ children }) => (
                      <pre className="glass rounded-lg p-4 font-mono text-xs text-foreground my-3 overflow-x-auto">
                        {children}
                      </pre>
                    ),
                    code: ({ className, children, ...rest }) => {
                      const isBlock = /language-/.test(className ?? '');
                      if (isBlock) {
                        return (
                          <code className={className} {...rest}>
                            {children}
                          </code>
                        );
                      }
                      return (
                        <code
                          className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
                          {...rest}
                        >
                          {children}
                        </code>
                      );
                    },
                    table: ({ children }) => (
                      <div className="my-3 overflow-x-auto">
                        <table className="w-full text-sm border-collapse">{children}</table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-white/10 px-3 py-2 text-left font-semibold text-foreground">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-white/10 px-3 py-2 text-muted-foreground">{children}</td>
                    ),
                  }}
                >
                  {sessionDetail?.assessment?.instructionsMd ?? 'Assessment instructions are loading.'}
                </ReactMarkdown>
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
