import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { AlertCircle, Bot, Brain, CheckCircle2, ChevronRight, Code2, Loader2, Sparkles, Trophy } from 'lucide-react';

interface GradeDimension {
  score: number;
  summary: string;
  flags: string[];
}

export interface CandidateGrade {
  sessionId: string;
  codeQuality: GradeDimension;
  agentUsage: GradeDimension;
  promptingQuality: GradeDimension;
  industryKnowledge: GradeDimension;
  compositeScore: number;
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no';
  gradedAt: string;
  modelId: string;
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

      {/* Score bar */}
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
            <ChevronRight
              className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
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

export default function GradingTab({ sessionId, initialGrade }: Props) {
  const [grade, setGrade] = useState<CandidateGrade | null>(initialGrade);
  const [isGrading, setIsGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function triggerGrading() {
    setIsGrading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/sessions/${sessionId}/grade`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Grading failed (${res.status})`);
      }
      const data = await res.json();
      setGrade(data as CandidateGrade);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grading failed');
    } finally {
      setIsGrading(false);
    }
  }

  if (!grade && !isGrading) {
    return (
      <div className="editorial-panel rounded-[1.75rem] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h3 className="mt-5 text-xl">AI Evaluation Not Yet Run</h3>
        <p className="mt-3 mx-auto max-w-md text-sm leading-6 text-white/55">
          Grade this submission across Code Quality, Agent Usage, Prompting Quality, and Industry Knowledge using Claude.
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
        <p className="mt-3 text-[11px] text-white/30">Powered by Claude — takes ~10 seconds</p>
      </div>
    );
  }

  if (isGrading) {
    return (
      <div className="editorial-panel rounded-[1.75rem] p-12 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <p className="mt-5 text-sm text-white/55">Claude is evaluating the submission…</p>
        <p className="mt-2 text-xs text-white/30">Analyzing code quality, agent usage, prompts, and domain knowledge</p>
      </div>
    );
  }

  const rec = RECOMMENDATION_DISPLAY[grade!.recommendation];

  return (
    <div className="space-y-4">
      {/* Composite score hero */}
      <div className="editorial-panel rounded-[1.9rem] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-primary/80">AI Evaluation</p>
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
              <p className="text-xs text-white/45">Code 40% · Agent 20% · Prompt 20% · Domain 20%</p>
            </div>
          </div>
        </div>

        {/* Composite progress bar */}
        <div className="mt-6 h-2 w-full rounded-full bg-white/8">
          <div
            className={`h-full rounded-full transition-all ${scoreBarColor(grade!.compositeScore)}`}
            style={{ width: `${grade!.compositeScore}%` }}
          />
        </div>

        {/* Mini dimension summary strip */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
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

      {/* Dimension breakdown */}
      <div className="grid gap-4 xl:grid-cols-2">
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

      {/* Footer metadata */}
      <div className="flex items-center gap-2 px-1 text-[11px] text-white/25">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>Graded by {grade!.modelId} on {new Date(grade!.gradedAt).toLocaleString()}</span>
      </div>
    </div>
  );
}
