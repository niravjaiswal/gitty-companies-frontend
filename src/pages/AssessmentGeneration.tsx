import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GlassNav from '@/components/GlassNav';
import LiquidButton from '@/components/LiquidButton';
import { apiFetch } from '@/lib/api';
import { parseRepoDisplayName, shortSha } from '@/lib/repoSource';
import { ArrowLeft, AlertTriangle, CheckCircle2, Copy, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed' | null;
type SourceType = 'skeleton' | 'repo' | null;

interface RepoIngestMetadata {
  filesKept?: number;
  filesDropped?: number;
  bytesStored?: number;
  droppedReasons?: Record<string, number>;
}

interface AssessmentSnapshot {
  id: string;
  title: string;
  summary: string;
  skeletonId: string | null;
  workspaceFileCount: number;
  generationStatus: GenerationStatus;
  generationError: string | null;
  generationStartedAt: string | null;
  generationCompletedAt: string | null;
  createdAt: string;
  sourceType: SourceType;
  sourceRepoUrl: string | null;
  sourceRepoRef: string | null;
  sourceRepoCommitSha: string | null;
  sourceRepoMetadata: RepoIngestMetadata | null;
}

const POLL_INTERVAL_MS = 3_000;
const LONG_RUN_THRESHOLD_MS = 10 * 60 * 1_000;

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export default function AssessmentGeneration() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [assessment, setAssessment] = useState<AssessmentSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const poll = useCallback(async () => {
    if (!id || cancelledRef.current) return;
    try {
      const res = await apiFetch(`/api/company/assessments/${id}`);
      if (!res.ok) throw new Error('Failed to load assessment');
      const data = (await res.json()) as AssessmentSnapshot;
      if (cancelledRef.current) return;
      setAssessment(data);
      setError(null);

      if (data.generationStatus === 'pending' || data.generationStatus === 'processing') {
        timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    } catch (err) {
      if (cancelledRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load assessment');
      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    }
  }, [id]);

  useEffect(() => {
    cancelledRef.current = false;
    poll();
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [poll]);

  useEffect(() => {
    const status = assessment?.generationStatus;
    if (status !== 'pending' && status !== 'processing') return;
    const clockTimer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clockTimer);
  }, [assessment?.generationStatus]);

  async function handleRegenerate() {
    if (!id) return;
    setRegenerating(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/company/assessments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateWorkspace: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to regenerate assessment');
      }
      const updated = (await res.json()) as AssessmentSnapshot;
      setAssessment(updated);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate assessment');
    } finally {
      setRegenerating(false);
    }
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : (
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        )}
      </div>
    );
  }

  const status = assessment.generationStatus;
  const isRepoSource = assessment.sourceType === 'repo';
  const repoDisplay = parseRepoDisplayName(assessment.sourceRepoUrl);
  const repoSha = shortSha(assessment.sourceRepoCommitSha);
  const startedAtMs = assessment.generationStartedAt
    ? new Date(assessment.generationStartedAt).getTime()
    : new Date(assessment.createdAt).getTime();
  const completedAtMs = assessment.generationCompletedAt
    ? new Date(assessment.generationCompletedAt).getTime()
    : null;
  const elapsedMs = (completedAtMs ?? now) - startedAtMs;
  const isLongRun =
    (status === 'pending' || status === 'processing') && elapsedMs > LONG_RUN_THRESHOLD_MS;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlassNav variant="company" />
      <div className="editorial-grid min-h-screen px-6 pb-16 pt-24">
        <div className="mx-auto w-full max-w-3xl">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>

          <section className="mt-6 editorial-panel rounded-[1.75rem] p-7 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.38em] text-primary/80">
              Assessment Generation
            </p>
            <h1 className="mt-4 text-3xl leading-tight md:text-4xl">{assessment.title}</h1>
            {assessment.summary && (
              <p className="mt-3 text-sm leading-6 text-white/62">{assessment.summary}</p>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {isRepoSource ? (
                <RepoTile url={assessment.sourceRepoUrl} display={repoDisplay} />
              ) : (
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Skeleton</p>
                  <p className="mt-2 text-sm text-white/80">
                    {assessment.skeletonId ?? 'Auto-detecting…'}
                  </p>
                </div>
              )}
              {isRepoSource && repoSha ? (
                <CommitTile sha={assessment.sourceRepoCommitSha} short={repoSha} />
              ) : (
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Elapsed</p>
                  <p className="mt-2 text-sm text-white/80">{formatElapsed(elapsedMs)}</p>
                </div>
              )}
              <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Files</p>
                <p className="mt-2 text-sm text-white/80">{assessment.workspaceFileCount}</p>
              </div>
            </div>

            {isRepoSource && repoSha && (
              <p className="mt-3 text-xs text-white/45">
                Elapsed {formatElapsed(elapsedMs)}
                {assessment.sourceRepoRef ? ` · branch ${assessment.sourceRepoRef}` : ''}
                {assessment.sourceRepoMetadata?.bytesStored
                  ? ` · ${formatBytes(assessment.sourceRepoMetadata.bytesStored)} stored`
                  : ''}
              </p>
            )}

            <div className="mt-6">
              {(status === 'pending' || status === 'processing') && (
                <PendingState status={status} isLongRun={isLongRun} isRepoSource={isRepoSource} />
              )}
              {status === 'completed' && (
                <CompletedState
                  isRepoSource={isRepoSource}
                  onReview={() => navigate(`/dashboard/assessments/${assessment.id}/editor`)}
                  onSend={() => navigate(`/dashboard/send/${assessment.id}`)}
                />
              )}
              {status === 'failed' && (
                <FailedState
                  error={assessment.generationError}
                  regenerating={regenerating}
                  isRepoSource={isRepoSource}
                  onRegenerate={handleRegenerate}
                  onEditSource={() => navigate('/dashboard/create')}
                />
              )}
              {status === null && (
                <p className="text-sm text-white/60">
                  This assessment has no generation job. Open the editor to review files.
                </p>
              )}
            </div>

            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

function RepoTile({ url, display }: { url: string | null; display: string | null }) {
  const label = display ?? url ?? 'Repo';
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Repo</p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2 inline-flex items-center gap-1.5 break-all text-sm text-white/80 transition-colors hover:text-primary"
        >
          {label}
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </a>
      ) : (
        <p className="mt-2 text-sm text-white/80">{label}</p>
      )}
    </div>
  );
}

function CommitTile({ sha, short }: { sha: string | null; short: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!sha) return;
    try {
      await navigator.clipboard.writeText(sha);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard unavailable — silently noop; user can select the text.
    }
  }

  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Commit</p>
      <button
        type="button"
        onClick={handleCopy}
        title={sha ?? undefined}
        className="mt-2 inline-flex items-center gap-1.5 font-mono text-sm text-white/80 transition-colors hover:text-primary"
      >
        {short}
        <Copy className="h-3.5 w-3.5 shrink-0 opacity-60" />
        {copied && <span className="text-[10px] uppercase tracking-[0.24em] text-emerald-300">Copied</span>}
      </button>
    </div>
  );
}

function PendingState({
  status,
  isLongRun,
  isRepoSource,
}: {
  status: 'pending' | 'processing';
  isLongRun: boolean;
  isRepoSource: boolean;
}) {
  const copy = isRepoSource
    ? status === 'pending'
      ? 'Queued — waiting to clone the repo.'
      : 'Cloning and filtering the repo. This usually takes under 30 seconds.'
    : status === 'pending'
      ? 'Queued — waiting for the generator to pick up this job.'
      : 'Generating workspace. This typically takes 2–4 minutes.';
  return (
    <div className="rounded-[1.4rem] border border-primary/20 bg-primary/5 p-6">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-sm text-white/80">{copy}</p>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/60" />
      </div>
      {isLongRun && (
        <p className="mt-4 text-xs text-amber-300/80">
          This is taking longer than expected. The backend will auto-recover stalled jobs after 10 minutes.
        </p>
      )}
    </div>
  );
}

function CompletedState({
  isRepoSource,
  onReview,
  onSend,
}: {
  isRepoSource: boolean;
  onReview: () => void;
  onSend: () => void;
}) {
  return (
    <div className="rounded-[1.4rem] border border-emerald-400/20 bg-emerald-400/[0.06] p-6">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-300" />
        <p className="text-sm text-white/80">
          {isRepoSource
            ? 'Repo imported. Review the snapshot before sending to candidates.'
            : 'Workspace generated and verified. Review the repo before sending to candidates.'}
        </p>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <LiquidButton onClick={onReview} className="h-11 rounded-full px-5">
          Review in editor
        </LiquidButton>
        <button
          onClick={onSend}
          className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-5 text-sm text-white/70 transition-colors hover:bg-white/10"
        >
          Skip to assignment studio
        </button>
      </div>
    </div>
  );
}

function FailedState({
  error,
  regenerating,
  isRepoSource,
  onRegenerate,
  onEditSource,
}: {
  error: string | null;
  regenerating: boolean;
  isRepoSource: boolean;
  onRegenerate: () => void;
  onEditSource: () => void;
}) {
  const headline = isRepoSource
    ? 'Repo ingest failed. You can retry the same URL or edit it first.'
    : 'Generation failed validation. You can retry with the same brief or edit it first.';
  return (
    <div className="rounded-[1.4rem] border border-rose-400/25 bg-rose-400/[0.05] p-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-rose-300" />
        <p className="text-sm text-white/80">{headline}</p>
      </div>
      {error && (
        <pre className="mt-4 max-h-64 overflow-auto rounded-[1rem] border border-white/8 bg-black/30 p-4 font-mono text-[12px] leading-6 text-white/60">
          {error}
        </pre>
      )}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <LiquidButton
          onClick={onRegenerate}
          disabled={regenerating}
          className="h-11 rounded-full px-5"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {regenerating ? 'Queueing retry…' : 'Retry'}
        </LiquidButton>
        <button
          onClick={onEditSource}
          className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-5 text-sm text-white/70 transition-colors hover:bg-white/10"
        >
          {isRepoSource ? 'Edit repo URL' : 'Edit brief'}
        </button>
      </div>
    </div>
  );
}
