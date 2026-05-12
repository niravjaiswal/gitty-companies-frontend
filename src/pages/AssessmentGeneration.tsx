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

interface VariationSelection {
  axis_id: string;
  value: string | number | boolean;
  is_default: boolean;
  rationale: string;
}

interface VariationMetrics {
  axes_count: number;
  non_default_count: number;
  planner_input_tokens: number;
  planner_output_tokens: number;
  executor: {
    turns: number;
    cost_usd: number;
    duration_ms: number;
    verified: boolean;
    sacred_violations: string[];
  } | null;
  overall_rationale: string;
  selections: VariationSelection[];
  not_applicable: string[];
}

type AdversarialVerdict = 'too-easy' | 'calibrated' | 'too-hard' | 'broken-tests' | 'tests-cheated';

interface AdversarialMetrics {
  verdict: AdversarialVerdict;
  rationale: string;
  solved_rate: number;
  median_turns: number;
  median_edits: number;
  avg_cost_usd: number;
  hardcoding_observed: boolean;
  test_files_modified: boolean;
  judgment_calls_observed: boolean;
  architectural_decisions_observed: boolean;
  num_runs: number;
}

interface GenerationMetrics {
  skeleton_id: string;
  primary: {
    turns: number;
    cost_usd: number;
    duration_ms: number;
    verified: boolean;
  };
  repair: { turns: number; cost_usd: number; verified: boolean } | null;
  variation: VariationMetrics | null;
  adversarial: AdversarialMetrics | null;
  final_verified: boolean;
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
  generationMetrics: GenerationMetrics | null;
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

            {assessment.generationMetrics && (
              <GenerationInsights metrics={assessment.generationMetrics} />
            )}

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

const ADVERSARIAL_VERDICT_STYLES: Record<AdversarialVerdict, { label: string; tone: string }> = {
  'calibrated': { label: 'Calibrated', tone: 'border-emerald-400/40 bg-emerald-400/[0.08] text-emerald-200' },
  'too-easy': { label: 'Too Easy', tone: 'border-amber-400/40 bg-amber-400/[0.08] text-amber-200' },
  'too-hard': { label: 'Too Hard', tone: 'border-amber-400/40 bg-amber-400/[0.08] text-amber-200' },
  'broken-tests': { label: 'Broken Tests', tone: 'border-rose-400/40 bg-rose-400/[0.08] text-rose-200' },
  'tests-cheated': { label: 'Tests Cheated', tone: 'border-rose-400/40 bg-rose-400/[0.08] text-rose-200' },
};

function GenerationInsights({ metrics }: { metrics: GenerationMetrics }) {
  const { variation, adversarial } = metrics;
  if (!variation && !adversarial) return null;

  return (
    <div className="mt-6 space-y-4 border-t border-white/8 pt-6">
      <p className="text-[11px] uppercase tracking-[0.38em] text-white/40">Generation Insights</p>

      {variation && (
        <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-white/85">Variation Plan</p>
            <p className="text-[11px] text-white/45">
              {variation.non_default_count}/{variation.axes_count} axes flexed
              {variation.executor && ` · $${variation.executor.cost_usd.toFixed(2)} · ${variation.executor.turns} turns`}
            </p>
          </div>
          {variation.overall_rationale && (
            <p className="mt-2 text-xs leading-5 text-white/55">{variation.overall_rationale}</p>
          )}
          {variation.selections.length > 0 && (
            <ul className="mt-3 space-y-2">
              {variation.selections.map((sel) => (
                <li key={sel.axis_id} className="flex items-start gap-2 text-xs">
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${
                      sel.is_default
                        ? 'border-white/15 bg-white/[0.04] text-white/55'
                        : 'border-primary/40 bg-primary/[0.1] text-primary/90'
                    }`}
                  >
                    {sel.is_default ? 'default' : 'flexed'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-white/80">
                      {sel.axis_id} = {JSON.stringify(sel.value)}
                    </p>
                    {sel.rationale && (
                      <p className="mt-0.5 text-white/50">{sel.rationale}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {variation.executor && variation.executor.sacred_violations.length > 0 && (
            <div className="mt-3 rounded-md border border-rose-400/30 bg-rose-400/5 px-3 py-2 text-[11px] text-rose-200">
              Sacred-anchor violations: {variation.executor.sacred_violations.join(', ')}
            </div>
          )}
        </div>
      )}

      {adversarial && (
        <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-white/85">Adversarial Gate</p>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] ${
                ADVERSARIAL_VERDICT_STYLES[adversarial.verdict]?.tone ?? 'border-white/15 text-white/65'
              }`}
            >
              {ADVERSARIAL_VERDICT_STYLES[adversarial.verdict]?.label ?? adversarial.verdict}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-white/55">{adversarial.rationale}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-4">
            <Stat label="Solved" value={`${(adversarial.solved_rate * 100).toFixed(0)}%`} />
            <Stat label="Edits" value={String(adversarial.median_edits)} />
            <Stat label="Turns" value={String(adversarial.median_turns)} />
            <Stat label="Cost" value={`$${adversarial.avg_cost_usd.toFixed(2)}`} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
            {adversarial.judgment_calls_observed && <Flag label="judgment calls" tone="emerald" />}
            {adversarial.architectural_decisions_observed && <Flag label="architectural" tone="emerald" />}
            {adversarial.test_files_modified && <Flag label="test edits" tone="rose" />}
            {adversarial.hardcoding_observed && <Flag label="hardcoding" tone="rose" />}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2">
      <p className="text-[9px] uppercase tracking-[0.22em] text-white/40">{label}</p>
      <p className="mt-1 text-sm text-white/85">{value}</p>
    </div>
  );
}

function Flag({ label, tone }: { label: string; tone: 'emerald' | 'rose' }) {
  const cls =
    tone === 'emerald'
      ? 'border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-200'
      : 'border-rose-400/30 bg-rose-400/[0.08] text-rose-200';
  return (
    <span className={`rounded-full border px-2 py-0.5 uppercase tracking-[0.14em] ${cls}`}>
      {label}
    </span>
  );
}
