import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassNav from '@/components/GlassNav';
import LiquidButton from '@/components/LiquidButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';
import {
  ArrowLeft,
  Clock3,
  Layers3,
  Plus,
  SendHorizonal,
  Sparkles,
  Target,
  WandSparkles,
} from 'lucide-react';

interface StageDraft {
  id: string;
  name: string;
  objective: string;
  instructionsMd: string;
}

const DEFAULT_SINGLE_INSTRUCTIONS = `## Candidate brief

You are joining an existing product team. Work inside the provided repository and leave the codebase in a production-ready state.

### What we expect
- Keep behavior correct
- Explain tradeoffs in code comments only where needed
- Prefer small, defensible changes over broad rewrites

### Deliverable
Ship working code and leave the tests passing where possible.`;

const DEFAULT_SOURCE_BRIEF = '';

function createStage(index: number, instructionsMd = ''): StageDraft {
  return {
    id: `stage-${index}-${Math.random().toString(36).slice(2, 8)}`,
    name: `Stage ${index}`,
    objective: '',
    instructionsMd,
  };
}

function buildInstructionsMarkdown(authoringMode: 'single' | 'multi', single: string, stages: StageDraft[]) {
  if (authoringMode === 'single') {
    return single.trim();
  }

  return stages
    .map((stage, index) => {
      const parts = [`## Stage ${index + 1}: ${stage.name.trim() || `Stage ${index + 1}`}`];
      if (stage.objective.trim()) {
        parts.push(`**Goal:** ${stage.objective.trim()}`);
      }
      parts.push(stage.instructionsMd.trim());
      return parts.join('\n\n');
    })
    .filter(Boolean)
    .join('\n\n');
}

export default function CreateAssessment() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [authoringMode, setAuthoringMode] = useState<'single' | 'multi'>('single');
  const [singleInstructionsMd, setSingleInstructionsMd] = useState(DEFAULT_SINGLE_INSTRUCTIONS);
  const [stages, setStages] = useState<StageDraft[]>([createStage(1, DEFAULT_SINGLE_INSTRUCTIONS)]);
  const [activeStageId, setActiveStageId] = useState(stages[0].id);
  const [sourceBrief, setSourceBrief] = useState(DEFAULT_SOURCE_BRIEF);
  const [durationMinutes, setDurationMinutes] = useState('90');
  const [submitting, setSubmitting] = useState<'draft' | 'published' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeStage = stages.find((stage) => stage.id === activeStageId) ?? stages[0];
  const instructionsMd = useMemo(
    () => buildInstructionsMarkdown(authoringMode, singleInstructionsMd, stages),
    [authoringMode, singleInstructionsMd, stages],
  );
  const hasValidInstructions =
    authoringMode === 'single'
      ? singleInstructionsMd.trim().length >= 10
      : stages.every((stage) => stage.name.trim() && stage.instructionsMd.trim());

  function updateStage(stageId: string, patch: Partial<StageDraft>) {
    setStages((current) =>
      current.map((stage) => (stage.id === stageId ? { ...stage, ...patch } : stage)),
    );
  }

  function addStage() {
    setStages((current) => {
      const next = [...current, createStage(current.length + 1)];
      setActiveStageId(next[next.length - 1].id);
      return next;
    });
    setAuthoringMode('multi');
  }

  function removeStage(stageId: string) {
    setStages((current) => {
      if (current.length === 1) return current;
      const next = current.filter((stage) => stage.id !== stageId);
      if (activeStageId === stageId) {
        setActiveStageId(next[0].id);
      }
      return next;
    });
  }

  async function handleSubmit(status: 'draft' | 'published') {
    setSubmitting(status);
    setError(null);

    try {
      const res = await apiFetch('/api/company/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          summary,
          instructionsMd,
          durationMinutes: Number(durationMinutes),
          sourceBrief,
          authoringConfig: {
            mode: authoringMode,
            stages:
              authoringMode === 'multi'
                ? stages.map((stage) => ({
                    id: stage.id,
                    name: stage.name.trim(),
                    objective: stage.objective.trim(),
                    instructionsMd: stage.instructionsMd.trim(),
                  }))
                : [],
          },
          status,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to create assessment');
      }

      const assessment = await res.json();
      navigate(`/dashboard/send/${assessment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assessment');
      setSubmitting(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlassNav variant="company" />
      <div className="assessment-studio-shell editorial-grid min-h-screen px-6 pb-16 pt-24">
        <div className="assessment-grid mx-auto max-w-7xl">
          <section className="signal-panel rounded-[2.2rem] px-8 py-8 md:px-10">
            <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-4xl">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to dashboard
                </button>

                <p className="mt-7 text-xs uppercase tracking-[0.45em] text-primary/80">
                  Recruiter Authoring Studio
                </p>
                <h1 className="mt-4 max-w-4xl text-4xl leading-tight md:text-6xl">
                  Use the screen like a hiring workbench, not a single oversized form.
                </h1>
                <p className="mt-5 max-w-3xl text-sm leading-7 text-white/62">
                  Keep the assessment metadata, internal assessment blueprint, and
                  candidate-facing prompt in one place. The candidate only sees the final brief.
                  Recruiters keep the generation intent private.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['Mode', authoringMode === 'single' ? 'Single brief' : `${stages.length} stages`],
                  ['Duration', `${durationMinutes || '--'} min`],
                  ['Blueprint', sourceBrief.trim() ? 'Detailed' : 'Empty'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[1.35rem] border border-white/10 bg-black/25 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">{label}</p>
                    <p className="mt-2 text-lg">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
              <section className="signal-panel rounded-[2rem] p-6">
                <p className="text-xs uppercase tracking-[0.35em] text-white/45">Assessment frame</p>
                <div className="mt-5 space-y-5">
                  <div>
                    <label className="mb-3 block text-xs uppercase tracking-[0.3em] text-white/45">
                      Assessment title
                    </label>
                    <Input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Senior Product Engineer"
                      className="h-14 rounded-2xl border-white/10 bg-white/5 text-lg"
                    />
                  </div>

                  <div>
                    <label className="mb-3 block text-xs uppercase tracking-[0.3em] text-white/45">
                      Internal summary
                    </label>
                    <Textarea
                      value={summary}
                      onChange={(event) => setSummary(event.target.value)}
                      placeholder="What this assessment measures and how your team will use it."
                      className="min-h-[132px] rounded-[1.5rem] border-white/10 bg-white/5 text-sm leading-6"
                    />
                  </div>
                </div>
              </section>

              <section className="signal-panel rounded-[2rem] p-6">
                <div className="flex items-center gap-3 text-primary">
                  <Clock3 className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-[0.35em]">Run settings</p>
                </div>
                <div className="mt-5 grid gap-4">
                  <div>
                    <label className="mb-3 block text-xs uppercase tracking-[0.3em] text-white/45">
                      Duration in minutes
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={480}
                      value={durationMinutes}
                      onChange={(event) => setDurationMinutes(event.target.value)}
                      className="h-12 rounded-2xl border-white/10 bg-white/5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        value: 'single' as const,
                        label: 'Single brief',
                        description: 'One uninterrupted candidate prompt.',
                      },
                      {
                        value: 'multi' as const,
                        label: 'Multi-stage',
                        description: 'Split the work into deliberate phases.',
                      },
                    ].map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => {
                          setAuthoringMode(mode.value);
                          if (mode.value === 'multi' && stages.length === 0) {
                            const nextStage = createStage(1, singleInstructionsMd);
                            setStages([nextStage]);
                            setActiveStageId(nextStage.id);
                          }
                        }}
                        className={`rounded-[1.35rem] border p-4 text-left transition-all ${
                          authoringMode === mode.value
                            ? 'border-primary bg-primary/12 text-white'
                            : 'border-white/10 bg-white/4 text-white/65 hover:border-white/20'
                        }`}
                      >
                        <p className="text-sm font-semibold">{mode.label}</p>
                        <p className="mt-2 text-xs leading-5 text-white/60">{mode.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

            </aside>

            <main className="space-y-6">
              <section className="signal-panel rounded-[2rem] p-6 md:p-8">
                <div className="grid gap-6 xl:grid-cols-[0.68fr_minmax(0,1.32fr)]">
                  <div>
                    <div className="flex items-center gap-3 text-primary">
                      <WandSparkles className="h-4 w-4" />
                      <p className="text-xs uppercase tracking-[0.35em]">Assessment blueprint</p>
                    </div>
                    <h2 className="mt-4 text-3xl md:text-4xl">
                      This is the internal scenario spec that drives what gets generated.
                    </h2>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-white/60">
                      Treat this as the recruiter-grade blueprint, not a side note. Define the
                      product reality, inherited system, constraints, and the candidate signals you
                      want the final assessment to expose.
                    </p>
                  </div>

                  <div>
                    <label className="mb-3 block text-xs uppercase tracking-[0.3em] text-white/45">
                      Blueprint details
                    </label>
                    <Textarea
                      value={sourceBrief}
                      onChange={(event) => setSourceBrief(event.target.value)}
                      placeholder="Describe the exact assessment you want generated: the company context, the system the candidate inherits, the business pressure, the failure modes to surface, the kinds of tradeoffs they should face, and the strongest signals your hiring team wants to evaluate."
                      className="min-h-[520px] rounded-[1.8rem] border-white/10 bg-black/25 text-sm leading-7"
                    />
                    <p className="mt-3 text-sm text-white/45">
                      Internal only. This content should guide generation and recruiter review, not
                      appear in the candidate instructions verbatim.
                    </p>
                  </div>
                </div>
              </section>

              <section className="signal-panel rounded-[2rem] p-6 md:p-8">
                <div className="flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3 text-primary">
                      <Layers3 className="h-4 w-4" />
                      <p className="text-xs uppercase tracking-[0.35em]">Candidate brief canvas</p>
                    </div>
                    <h2 className="mt-4 text-3xl md:text-4xl">
                      Give the actual writing room to the part recruiters iterate on.
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
                      The right side is reserved for the prompt itself. Use single mode for one
                      brief, or split the assessment into staged prompts that still save as one
                      candidate-facing markdown document.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {authoringMode === 'multi' && (
                      <button
                        type="button"
                        onClick={addStage}
                        className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white/70 transition-colors hover:border-white/20 hover:text-white"
                      >
                        <Plus className="h-4 w-4" />
                        Add stage
                      </button>
                    )}
                    <div className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-primary">
                      {authoringMode === 'single' ? 'Single prompt' : 'Staged workflow'}
                    </div>
                  </div>
                </div>

                {authoringMode === 'single' ? (
                  <div className="mt-6">
                    <label className="mb-3 block text-xs uppercase tracking-[0.3em] text-white/45">
                      Candidate instructions or PRD
                    </label>
                    <Textarea
                      value={singleInstructionsMd}
                      onChange={(event) => setSingleInstructionsMd(event.target.value)}
                      className="min-h-[620px] rounded-[1.8rem] border-white/10 bg-black/25 font-mono text-sm leading-7 text-white/82"
                    />
                  </div>
                ) : (
                  <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <div className="space-y-3">
                      {stages.map((stage, index) => {
                        const isActive = stage.id === activeStage?.id;
                        return (
                          <button
                            key={stage.id}
                            type="button"
                            onClick={() => setActiveStageId(stage.id)}
                            className={`w-full rounded-[1.45rem] border p-4 text-left transition-all ${
                              isActive
                                ? 'border-primary bg-primary/10'
                                : 'border-white/10 bg-white/4 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs uppercase tracking-[0.3em] text-white/45">
                                Stage {index + 1}
                              </span>
                              <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-white/45">
                                {stage.instructionsMd.trim() ? 'Ready' : 'Draft'}
                              </span>
                            </div>
                            <p className="mt-3 text-base">{stage.name || `Stage ${index + 1}`}</p>
                            <p className="mt-2 text-sm leading-6 text-white/55">
                              {stage.objective || 'Add a goal so recruiters understand what this phase proves.'}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {activeStage && (
                      <div className="rounded-[1.8rem] border border-white/10 bg-black/20 p-5 md:p-6">
                        <div className="grid gap-5 md:grid-cols-[0.85fr_1.15fr]">
                          <div>
                            <label className="mb-3 block text-xs uppercase tracking-[0.3em] text-white/45">
                              Stage name
                            </label>
                            <Input
                              value={activeStage.name}
                              onChange={(event) =>
                                updateStage(activeStage.id, { name: event.target.value })
                              }
                              placeholder="Discovery and diagnosis"
                              className="h-12 rounded-2xl border-white/10 bg-white/5"
                            />
                          </div>
                          <div>
                            <label className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/45">
                              <Target className="h-3.5 w-3.5" />
                              Stage objective
                            </label>
                            <Input
                              value={activeStage.objective}
                              onChange={(event) =>
                                updateStage(activeStage.id, { objective: event.target.value })
                              }
                              placeholder="Establish how the candidate reasons about the existing system."
                              className="h-12 rounded-2xl border-white/10 bg-white/5"
                            />
                          </div>
                        </div>

                        <div className="mt-5">
                          <label className="mb-3 block text-xs uppercase tracking-[0.3em] text-white/45">
                            Stage instructions
                          </label>
                          <Textarea
                            value={activeStage.instructionsMd}
                            onChange={(event) =>
                              updateStage(activeStage.id, { instructionsMd: event.target.value })
                            }
                            className="min-h-[520px] rounded-[1.6rem] border-white/10 bg-white/5 font-mono text-sm leading-7"
                          />
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
                          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/40">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            Candidates will see stages merged into one brief
                          </div>
                          <button
                            type="button"
                            onClick={() => removeStage(activeStage.id)}
                            disabled={stages.length === 1}
                            className="text-sm text-white/55 transition-colors hover:text-white disabled:cursor-not-allowed disabled:text-white/25"
                          >
                            Remove stage
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {error && <p className="text-sm text-red-300">{error}</p>}

              <div className="signal-panel flex flex-col gap-3 rounded-[2rem] p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="px-2 text-sm text-white/55">
                  Save a draft for internal review, or publish immediately and move to assignment.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <LiquidButton
                    onClick={() => handleSubmit('draft')}
                    disabled={
                      submitting !== null || !title.trim() || !hasValidInstructions || !Number(durationMinutes)
                    }
                    variant="outline"
                    className="h-12 rounded-full px-6"
                  >
                    {submitting === 'draft' ? 'Saving draft...' : 'Save draft'}
                  </LiquidButton>
                  <LiquidButton
                    onClick={() => handleSubmit('published')}
                    disabled={
                      submitting !== null || !title.trim() || !hasValidInstructions || !Number(durationMinutes)
                    }
                    className="h-12 rounded-full px-6"
                  >
                    <SendHorizonal className="mr-2 h-4 w-4" />
                    {submitting === 'published' ? 'Publishing...' : 'Publish and assign'}
                  </LiquidButton>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
