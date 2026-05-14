import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  AlertCircle,
  Bot,
  Brain,
  CheckCircle2,
  ChevronRight,
  Code2,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';

interface GradeDimension {
  score: number;
  summary: string;
  flags: string[];
}

export type GradingPath =
  | 'full'
  | 'short_circuit_build_fail'
  | 'short_circuit_tests_zero'
  | 'runner_error_llm_only'
  | 'legacy_no_correctness';

export type BuildStatus = 'pass' | 'fail' | 'error' | 'skipped';

export interface CandidateGrade {
  sessionId: string;
  correctness?: GradeDimension;
  codeQuality: GradeDimension;
  agentUsage: GradeDimension;
  promptingQuality: GradeDimension;
  industryKnowledge: GradeDimension;
  compositeScore: number;
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no';
  gradingPath?: GradingPath;
  buildStatus?: BuildStatus | null;
  testsPassed?: number | null;
  testsTotal?: number | null;
  runnerVersion?: string | null;
  weightsVersion?: string;
  gradedAt: string;
  modelId: string;
}

interface JobStatus {
  status: 'pending' | 'running';
  stage: 'runner' | 'llm' | 'finalize' | null;
}

interface Props {
  sessionId: string;
  initialGrade: CandidateGrade | null;
}

const RECOMMENDATION_DISPLAY: Record<CandidateGrade['recommendation'], { label: string; color: string }> = {
  strong_yes: { label: 'Strong Yes', color: 'text-emerald-300 border-emerald-300/25 bg-emerald-300/10' },
  yes: { label: 'Yes', color: 'text-emerald-200 border-emerald-200/20 bg-emerald-200/8' },
  maybe: { label: 'Maybe', color: 'text-amber-300 border-amber-300/25 bg-amber-300/10' },
  no: { label: 'No', color: 'text-rose-300 border-rose-300/20 bg-rose-300/8' },
  strong_no: { label: 'Strong No', color: 'text-rose-400 border-rose-400/25 bg-rose-400/10' },
};

const STAGE_LABEL: Record<NonNullable<JobStatus['stage']>, string> = {
  runner: 'Running build & tests in sandbox…',
  llm: 'Evaluating code quality with Claude…',
  finalize: 'Finalizing composite score…',
};

const GRADING_PATH_BANNER: Partial<Record<GradingPath, { tone: 'fail' | 'warn' | 'info'; title: string; body: string }>> = {
  short_circuit_build_fail: {
    tone: 'fail',
    title: 'Auto-rejected — build failed',
    body: 'Submission did not compile or install. Subjective grading was skipped to conserve evaluation cost. The recruiter can still review the code below.',
  },
  short_circuit_tests_zero: {
    tone: 'fail',
    title: 'Auto-flagged — zero tests passed',
    body: 'Submission built but no test passed. Subjective grading was skipped. Review the test failures before considering an interview.',
  },
  runner_error_llm_only: {
    tone: 'warn',
    title: 'Correctness signal unavailable',
    body: 'The runner could not measure correctness (no Node project or sandbox error). Dimensions below were graded by Claude only.',
  },
  legacy_no_correctness: {
    tone: 'info',
    title: 'Legacy grade',
    body: 'This grade pre-dates the correctness runner. Re-grade to capture deterministic build and test signal.',
  },
};

function scoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-300';
  if (score >= 70) return 'text-primary';
  if (score >= 55) return 'text-amber-300';
  return 'text-rose-300';
}

function scoreBarColor(score: number): string {
  if (score >= 85) return 'bg-emerald-400';
  if (score >= 70) return 'bg-orange-400';
  if (score >= 55) return 'bg-amber-400';
  return 'bg-rose-400';
}

function weightsLabel(grade: CandidateGrade): string {
  if (grade.weightsVersion === 'v2') {
    return 'Correctness 40% · Code 20% · Domain 15% · Agent 15% · Prompts 10%';
  }
  return 'Code 40% · Agent 20% · Prompts 20% · Domain 20%';
}

interface DimensionCardProps {
  icon: React.ReactNode;
  label: string;
  dimension: GradeDimension;
}

function DimensionCard({ icon, label, dimension }: DimensionCardProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-primary/70">{icon}</span>
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">{label}</p>
        </div>
        <span className={`text-3xl font-light tabular-nums ${scoreColor(dimension.score)}`}>
          {dimension.score}
        </span>
      </div>

      <div className="mt-3 h-1.5 w-full rounded-full bg-white/8">
        <div
          className={`h-full rounded-full transition-all ${scoreBarColor(dimension.score)}`}
          style={{ width: `${dimension.score}%` }}
        />
      </div>

      <p className="mt-4 text-sm leading-6 text-white/68">{dimension.summary}</p>

      {dimension.flags.length > 0 && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 flex items-center gap-1 text-[11px] uppercase tracking-[0.22em] text-white/38 hover:text-white/60 transition-colors"
          >
            <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            {dimension.flags.length} signal{dimension.flags.length !== 1 ? 's' : ''}
          </button>

          {expanded && (
            <div className="mt-3 space-y-2">
              {dimension.flags.map((flag, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-[0.75rem] border border-white/8 bg-black/20 px-3 py-2"
                >
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <p className="text-sm leading-5 text-white/62">{flag}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CorrectnessHero({ grade }: { grade: CandidateGrade }) {
  if (!grade.correctness) return null;
  // Hide hero when correctness wasn't measured — the path banner already
  // explains why (legacy, runner error, or non-Node submission).
  if (!grade.buildStatus || grade.buildStatus === 'error' || grade.buildStatus === 'skipped') {
    return null;
  }
  const buildPass = grade.buildStatus === 'pass';
  const buildFail = grade.buildStatus === 'fail';
  const Icon = buildPass ? CheckCircle2 : buildFail ? XCircle : ShieldCheck;
  const tone = buildPass
    ? 'text-emerald-300 border-emerald-300/25 bg-emerald-300/10'
    : buildFail
      ? 'text-rose-300 border-rose-400/25 bg-rose-400/10'
      : 'text-amber-300 border-amber-300/25 bg-amber-300/10';

  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-full border p-1.5 ${tone}`}>
            <Icon className="h-4 w-4" />
          </span>
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Correctness (mechanical)</p>
        </div>
        <span className={`text-3xl font-light tabular-nums ${scoreColor(grade.correctness.score)}`}>
          {grade.correctness.score}
        </span>
      </div>

      <div className="mt-3 h-1.5 w-full rounded-full bg-white/8">
        <div
          className={`h-full rounded-full transition-all ${scoreBarColor(grade.correctness.score)}`}
          style={{ width: `${grade.correctness.score}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-[0.75rem] border border-white/8 bg-black/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Build</p>
          <p className="mt-1 text-white/72">{grade.buildStatus ?? 'unknown'}</p>
        </div>
        <div className="rounded-[0.75rem] border border-white/8 bg-black/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Tests</p>
          <p className="mt-1 text-white/72">
            {grade.testsTotal !== null && grade.testsTotal !== undefined
              ? `${grade.testsPassed ?? 0} / ${grade.testsTotal}`
              : '—'}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-white/68">{grade.correctness.summary}</p>
    </div>
  );
}

function PathBanner({ path }: { path: GradingPath }) {
  const banner = GRADING_PATH_BANNER[path];
  if (!banner) return null;
  const tone =
    banner.tone === 'fail'
      ? 'border-rose-400/25 bg-rose-400/8 text-rose-200'
      : banner.tone === 'warn'
        ? 'border-amber-300/25 bg-amber-300/8 text-amber-100'
        : 'border-white/15 bg-white/[0.04] text-white/70';
  return (
    <div className={`rounded-[1.2rem] border px-4 py-3 ${tone}`}>
      <p className="text-sm font-medium">{banner.title}</p>
      <p className="mt-1 text-xs leading-5 opacity-80">{banner.body}</p>
    </div>
  );
}

export default function GradingTab({ sessionId, initialGrade }: Props) {
  const [grade, setGrade] = useState<CandidateGrade | null>(initialGrade);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pollGrade = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/sessions/${sessionId}/grade`);
      if (res.status === 200) {
        const data = (await res.json()) as CandidateGrade;
        setGrade(data);
        setJobStatus(null);
        return;
      }
      if (res.status === 202) {
        const data = (await res.json()) as JobStatus;
        setJobStatus(data);
        pollRef.current = setTimeout(pollGrade, 2_500);
        return;
      }
      if (res.status === 500) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Grading failed');
        setJobStatus(null);
        return;
      }
      // 404: no job, no grade — leave state untouched
      setJobStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to poll grade');
      setJobStatus(null);
    }
  }, [sessionId]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  // If parent passed no initial grade, check whether a job is already in flight.
  useEffect(() => {
    if (initialGrade) return;
    void pollGrade();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function triggerGrading() {
    setRequesting(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/sessions/${sessionId}/grade`, { method: 'POST' });
      if (res.status === 200) {
        const data = (await res.json()) as CandidateGrade;
        setGrade(data);
        setJobStatus(null);
        return;
      }
      if (res.status === 202) {
        const data = (await res.json()) as JobStatus;
        setJobStatus(data);
        if (pollRef.current) clearTimeout(pollRef.current);
        pollRef.current = setTimeout(pollGrade, 2_500);
        return;
      }
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `Grading failed (${res.status})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grading failed');
    } finally {
      setRequesting(false);
    }
  }

  if (!grade && !jobStatus && !requesting) {
    return (
      <div className="editorial-panel rounded-[1.75rem] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h3 className="mt-5 text-xl">Evaluation Not Yet Run</h3>
        <p className="mt-3 mx-auto max-w-md text-sm leading-6 text-white/55">
          Run the build + test suite in an isolated sandbox, then grade subjective dimensions with Claude.
        </p>
        {error && (
          <div className="mt-4 mx-auto max-w-md flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/8 px-4 py-3 text-sm text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        <button
          onClick={triggerGrading}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-85"
        >
          <Sparkles className="h-4 w-4" />
          Grade This Submission
        </button>
        <p className="mt-3 text-[11px] text-white/30">Mechanical correctness + Claude review · ~2 minutes</p>
      </div>
    );
  }

  if (!grade && (jobStatus || requesting)) {
    const stageMessage = jobStatus?.stage ? STAGE_LABEL[jobStatus.stage] : 'Queued for grading…';
    return (
      <div className="editorial-panel rounded-[1.75rem] p-12 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <p className="mt-5 text-sm text-white/55">{stageMessage}</p>
        <p className="mt-2 text-xs text-white/30">Build + tests run in an isolated sandbox before AI review.</p>
        {error && (
          <div className="mt-4 mx-auto max-w-md flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/8 px-4 py-3 text-sm text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>
    );
  }

  const rec = RECOMMENDATION_DISPLAY[grade!.recommendation];
  const gradingPath = grade!.gradingPath ?? 'legacy_no_correctness';
  // Only treat correctness as displayable when the runner actually measured it.
  const hasCorrectness =
    grade!.correctness !== undefined &&
    grade!.buildStatus !== null &&
    grade!.buildStatus !== undefined &&
    grade!.buildStatus !== 'error' &&
    grade!.buildStatus !== 'skipped';

  return (
    <div className="space-y-4">
      <PathBanner path={gradingPath} />

      <div className="editorial-panel rounded-[1.9rem] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-primary/80">Evaluation</p>
            <div className="mt-3 flex items-baseline gap-3">
              <span className={`text-6xl font-light tabular-nums ${scoreColor(grade!.compositeScore)}`}>
                {grade!.compositeScore}
              </span>
              <span className="text-lg text-white/35">/ 100</span>
            </div>
            <p className="mt-1 text-sm text-white/45">Composite score</p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <span className={`rounded-full border px-4 py-2 text-sm uppercase tracking-[0.2em] ${rec.color}`}>
              {rec.label}
            </span>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Weights</p>
              <p className="text-xs text-white/45">{weightsLabel(grade!)}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 h-2 w-full rounded-full bg-white/8">
          <div
            className={`h-full rounded-full transition-all ${scoreBarColor(grade!.compositeScore)}`}
            style={{ width: `${grade!.compositeScore}%` }}
          />
        </div>

        <div className={`mt-5 grid grid-cols-2 gap-3 ${hasCorrectness ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
          {hasCorrectness && (
            <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-3 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">Correct</p>
              <p className={`mt-2 text-2xl tabular-nums font-light ${scoreColor(grade!.correctness!.score)}`}>
                {grade!.correctness!.score}
              </p>
            </div>
          )}
          {[
            { label: 'Code', score: grade!.codeQuality.score },
            { label: 'Agent', score: grade!.agentUsage.score },
            { label: 'Prompts', score: grade!.promptingQuality.score },
            { label: 'Domain', score: grade!.industryKnowledge.score },
          ].map(({ label, score }) => (
            <div
              key={label}
              className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-3 py-3 text-center"
            >
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">{label}</p>
              <p className={`mt-2 text-2xl tabular-nums font-light ${scoreColor(score)}`}>{score}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {hasCorrectness && <CorrectnessHero grade={grade!} />}
        <DimensionCard
          icon={<Code2 className="h-4 w-4" />}
          label="Code Quality & Style"
          dimension={grade!.codeQuality}
        />
        <DimensionCard
          icon={<Bot className="h-4 w-4" />}
          label="Agent Usage"
          dimension={grade!.agentUsage}
        />
        <DimensionCard
          icon={<Brain className="h-4 w-4" />}
          label="Prompting Quality"
          dimension={grade!.promptingQuality}
        />
        <DimensionCard
          icon={<Trophy className="h-4 w-4" />}
          label="Industry Knowledge"
          dimension={grade!.industryKnowledge}
        />
      </div>

      <div className="flex items-center gap-2 px-1 text-[11px] text-white/25">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>
          Graded by {grade!.modelId}
          {grade!.runnerVersion ? ` · runner ${grade!.runnerVersion}` : ''}
          {' on '}
          {new Date(grade!.gradedAt).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
