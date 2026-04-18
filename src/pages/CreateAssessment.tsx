import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassNav from '@/components/GlassNav';
import LiquidButton from '@/components/LiquidButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Clock3, Library, SendHorizonal, Sparkles, WandSparkles } from 'lucide-react';

const JOB_DESCRIPTION_MAX = 10_000;
const EXAM_SPECIFICS_MAX = 5_000;
const PART_COUNT_MIN = 1;
const PART_COUNT_MAX = 26;

interface SkeletonListItem {
  id: string;
  name: string;
  language: string;
  pattern: string;
  description: string;
  domainTags: string[];
  skillAxes: string[];
  difficultyRange: { min: string; max: string };
  estimatedScope: { min: string; max: string };
}

function buildLivePrompt(role: string, jobDescription: string, repoUrl: string): string {
  const cleanRole = role.trim() || 'Senior Engineer';
  const sections: string[] = [`Role: ${cleanRole}`];

  if (jobDescription.trim()) {
    sections.push(`Job description / role context:\n${jobDescription.trim()}`);
  }

  if (repoUrl.trim()) {
    sections.push(`Reference repo (context only, not yet ingested): ${repoUrl.trim()}`);
  }

  sections.push(`Generate a realistic coding assessment as a runnable project the candidate can open in VS Code.

The assessment should match the role's stack and responsibilities. Pick the skeleton that best fits — or let Gitty auto-detect from this brief. If the role is frontend-heavy, lean React + TypeScript + Vite with a real product surface. If backend, Node/Express or Fastify with endpoints and persistence. If data, a stream/batch pipeline. If systems/CLI, a real tool with flags and tests.

Focus on:
- signals that match the role (fundamentals, debugging, product decisions)
- inheriting an existing codebase and finishing one incomplete feature
- clear README and setup steps
- actual source files, app logic, and tests — not only sandbox/bootstrap files`);

  return sections.join('\n\n');
}

function deriveAssessmentTitle(prompt: string): string {
  const firstMeaningfulLine = prompt
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstMeaningfulLine) {
    return 'Generated Technical Assessment';
  }

  return firstMeaningfulLine.replace(/^#+\s*/, '').slice(0, 120);
}

function deriveAssessmentSummary(prompt: string): string {
  const normalized = prompt.replace(/\s+/g, ' ').trim();
  return normalized.slice(0, 280);
}

export default function CreateAssessment() {
  const navigate = useNavigate();
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('90');
  const [intakeRepoUrl, setIntakeRepoUrl] = useState('');
  const [intakeRole, setIntakeRole] = useState('');
  const [intakeJobDescription, setIntakeJobDescription] = useState('');
  const [intakeExamSpecifics, setIntakeExamSpecifics] = useState('');
  const [intakePartCount, setIntakePartCount] = useState('1');
  const [builderReady, setBuilderReady] = useState(false);
  const [isGeneratingPreset, setIsGeneratingPreset] = useState(false);
  const [submitting, setSubmitting] = useState<'draft' | 'published' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skeletons, setSkeletons] = useState<SkeletonListItem[]>([]);
  const [skeletonId, setSkeletonId] = useState<string | null>(null);

  const compiledPrompt = generationPrompt;
  const derivedTitle = deriveAssessmentTitle(compiledPrompt);
  const derivedSummary = deriveAssessmentSummary(compiledPrompt);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/company/skeletons')
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as SkeletonListItem[];
        if (!cancelled) setSkeletons(data);
      })
      .catch(() => {
        // Picker is optional — backend auto-detects if unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function startGeneratedBuilder() {
    setIsGeneratingPreset(true);
    setError(null);

    window.setTimeout(() => {
      setGenerationPrompt(buildLivePrompt(intakeRole, intakeJobDescription, intakeRepoUrl));
      setBuilderReady(true);
      setIsGeneratingPreset(false);
    }, 1400);
  }

  async function handleSubmit(status: 'draft' | 'published') {
    setSubmitting(status);
    setError(null);

    try {
      const trimmedPrompt = compiledPrompt.trim();
      const parsedPartCount = Number(intakePartCount);
      const normalizedPartCount = Math.max(
        PART_COUNT_MIN,
        Math.min(
          PART_COUNT_MAX,
          Number.isFinite(parsedPartCount) && parsedPartCount >= PART_COUNT_MIN
            ? Math.floor(parsedPartCount)
            : 1,
        ),
      );
      const trimmedSpecifics = intakeExamSpecifics.trim();
      const res = await apiFetch('/api/company/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: derivedTitle,
          summary: derivedSummary,
          instructionsMd: trimmedPrompt,
          durationMinutes: Number(durationMinutes),
          sourceBrief: trimmedPrompt,
          skeletonId: skeletonId ?? undefined,
          authoringConfig: {
            mode: 'single',
            stages: [],
            partCount: normalizedPartCount,
            examSpecifics: trimmedSpecifics || undefined,
          },
          status,
          generateWorkspace: true,
          demoMode: false,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to create assessment workspace');
      }

      const assessment = await res.json();
      const destination =
        assessment.generationStatus === 'pending'
          ? `/dashboard/assessments/${assessment.id}/generation`
          : `/dashboard/send/${assessment.id}`;
      navigate(destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assessment workspace');
      setSubmitting(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlassNav variant="company" />
      <div className="assessment-studio-shell editorial-grid min-h-screen px-6 pb-16 pt-24">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
          {!builderReady ? (
            <section className="signal-panel rounded-[2rem] p-8 md:p-10">
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </button>

              <div className="mt-8 grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.38em] text-primary/80">
                    Gitty intake
                  </p>
                  <h1 className="mt-4 text-4xl leading-tight md:text-5xl">
                    Describe the role. Gitty generates the sprint.
                  </h1>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-white/60">
                    Tell Gitty who you're hiring and optionally attach a company repo for extra context. Then Gitty builds the assessment brief and reviewer flow for you.
                  </p>
                </div>

                <div className="rounded-[1.7rem] border border-white/10 bg-black/20 p-6">
                  {isGeneratingPreset ? (
                    <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                      <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <p className="mt-6 text-[11px] uppercase tracking-[0.34em] text-primary/80">
                        Generating
                      </p>
                      <h2 className="mt-3 text-2xl">Building your Gitty sprint</h2>
                      <p className="mt-3 max-w-md text-sm leading-6 text-white/58">
                        Pulling the repo context, shaping the role-specific task, and preparing the reviewer handoff.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div>
                        <label className="mb-2 block text-[11px] uppercase tracking-[0.26em] text-white/45">
                          Role you are hiring for
                        </label>
                        <Input
                          value={intakeRole}
                          onChange={(event) => setIntakeRole(event.target.value)}
                          className="h-12 rounded-[1.1rem] border-white/10 bg-white/5"
                          placeholder="Senior Frontend Engineer"
                        />
                      </div>

                      <div>
                        <label className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] text-white/45">
                          Job description / role details
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] tracking-[0.2em] text-white/45">
                            Recommended
                          </span>
                        </label>
                        <Textarea
                          value={intakeJobDescription}
                          onChange={(event) =>
                            setIntakeJobDescription(event.target.value.slice(0, JOB_DESCRIPTION_MAX))
                          }
                          maxLength={JOB_DESCRIPTION_MAX}
                          className="min-h-[200px] rounded-[1.25rem] border-white/10 bg-white/5 text-sm leading-7"
                          placeholder="Paste the job description or write what you want the candidate to prove they can do. Stack, seniority signals, product area, must-have skills, things that have tripped up past hires — the more context, the more tailored the sprint."
                        />
                        <div className="mt-2 flex items-center justify-between gap-3 text-sm text-white/50">
                          <p>Gitty weaves this into the generation prompt so the assessment matches your actual role, not a generic template.</p>
                          <span
                            className={`shrink-0 tabular-nums text-xs ${
                              intakeJobDescription.length >= JOB_DESCRIPTION_MAX
                                ? 'text-rose-300'
                                : intakeJobDescription.length > JOB_DESCRIPTION_MAX * 0.9
                                  ? 'text-amber-300'
                                  : 'text-white/40'
                            }`}
                          >
                            {intakeJobDescription.length.toLocaleString()} / {JOB_DESCRIPTION_MAX.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] text-white/45">
                          Assessment specifics
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] tracking-[0.2em] text-white/45">
                            Optional
                          </span>
                        </label>
                        <Textarea
                          value={intakeExamSpecifics}
                          onChange={(event) =>
                            setIntakeExamSpecifics(event.target.value.slice(0, EXAM_SPECIFICS_MAX))
                          }
                          maxLength={EXAM_SPECIFICS_MAX}
                          className="min-h-[140px] rounded-[1.25rem] border-white/10 bg-white/5 text-sm leading-7"
                          placeholder="What should this assessment emphasize or avoid? e.g. focus on error handling, skip auth, no database work, make it heavy on TypeScript types."
                        />
                        <div className="mt-2 flex items-center justify-between gap-3 text-sm text-white/50">
                          <p>Hard requirements — these override the skeleton's defaults when Gitty writes the candidate brief.</p>
                          <span
                            className={`shrink-0 tabular-nums text-xs ${
                              intakeExamSpecifics.length >= EXAM_SPECIFICS_MAX
                                ? 'text-rose-300'
                                : intakeExamSpecifics.length > EXAM_SPECIFICS_MAX * 0.9
                                  ? 'text-amber-300'
                                  : 'text-white/40'
                            }`}
                          >
                            {intakeExamSpecifics.length.toLocaleString()} / {EXAM_SPECIFICS_MAX.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-[11px] uppercase tracking-[0.26em] text-white/45">
                          Number of parts
                        </label>
                        <Input
                          type="number"
                          min={PART_COUNT_MIN}
                          max={PART_COUNT_MAX}
                          step={1}
                          value={intakePartCount}
                          onChange={(event) => setIntakePartCount(event.target.value)}
                          className="h-12 w-32 rounded-[1.1rem] border-white/10 bg-white/5"
                        />
                        <p className="mt-2 text-sm text-white/50">
                          1 for a focused sprint. 2–3 for progressive scope (must-ship, follow-up, stretch). Higher for multi-segment exams.
                        </p>
                      </div>

                      <div>
                        <label className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] text-white/45">
                          Company GitHub codebase
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] tracking-[0.2em] text-white/45">
                            Optional
                          </span>
                        </label>
                        <Textarea
                          value={intakeRepoUrl}
                          onChange={(event) => setIntakeRepoUrl(event.target.value)}
                          className="min-h-[88px] rounded-[1.25rem] border-white/10 bg-white/5 text-sm leading-7"
                          placeholder="Paste a GitHub repo URL if you want Gitty to reference it. Leave blank to generate from the role alone."
                        />
                        <p className="mt-2 text-sm text-white/50">
                          Reserved for future repo-aware generation. Today it's embedded in the brief as context only.
                        </p>
                      </div>

                      <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-[11px] uppercase tracking-[0.26em] text-white/42">What Gitty will generate</p>
                        <div className="mt-3 space-y-2 text-sm leading-6 text-white/62">
                          <p>Role-specific sprint brief</p>
                          <p>Repo-aware candidate instructions</p>
                          <p>
                            {(() => {
                              const n = Math.max(
                                PART_COUNT_MIN,
                                Math.min(PART_COUNT_MAX, Number(intakePartCount) || 1),
                              );
                              if (n === 1) return 'Single-part implementation scope';
                              const last = String.fromCharCode(64 + n);
                              return `Part A through Part ${last} implementation scope`;
                            })()}
                          </p>
                          <p>Reviewer-ready handoff panels</p>
                        </div>
                      </div>

                      <LiquidButton
                        onClick={startGeneratedBuilder}
                        disabled={!intakeRole.trim()}
                        className="h-12 rounded-full px-6"
                      >
                        <WandSparkles className="mr-2 h-4 w-4" />
                        Generate assessment
                      </LiquidButton>
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : (
            <>
          <section className="signal-panel rounded-[1.75rem] px-6 py-5 md:px-7">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </button>

            <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-[11px] uppercase tracking-[0.38em] text-primary/80">
                    Assessment Builder
                  </p>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/55">
                    Single prompt
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[460px]">
                {[
                  ['Title', derivedTitle || 'Pending'],
                  ['Duration', `${durationMinutes || '--'} min`],
                  ['Prompt', generationPrompt.trim() ? 'Ready' : 'Empty'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">{label}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-white/82">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
              <section className="signal-panel rounded-[1.6rem] p-5">
                <div className="flex items-center gap-3 text-primary">
                  <Clock3 className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-[0.32em]">Run settings</p>
                </div>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-2 block text-[11px] uppercase tracking-[0.26em] text-white/45">
                      Duration
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={480}
                      value={durationMinutes}
                      onChange={(event) => setDurationMinutes(event.target.value)}
                      className="h-11 rounded-[1rem] border-white/10 bg-white/5"
                    />
                  </div>
                </div>
              </section>

              <section className="signal-panel rounded-[1.6rem] p-5">
                <div className="flex items-center gap-3 text-primary">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-[0.32em]">Prompt checklist</p>
                </div>
                <div className="mt-4 space-y-3 text-sm leading-6 text-white/62">
                  <p>Role, level, stack.</p>
                  <p>Product idea and must-have features.</p>
                  <p>What is broken, incomplete, or intentionally missing.</p>
                  <p>Signals you want from the candidate.</p>
                </div>
              </section>
            </aside>

            <main className="space-y-6">
              <section className="signal-panel rounded-[1.7rem] p-5 md:p-6">
                <div className="flex items-center gap-3 text-primary">
                  <Library className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-[0.32em]">Skeleton</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/58">
                  Pick the starter repo Gitty will adapt. Auto-detect uses the brief to choose.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <SkeletonCard
                    selected={skeletonId === null}
                    onClick={() => setSkeletonId(null)}
                    title="Auto-detect"
                    subtitle="Pick based on brief"
                    description="Let the backend choose the closest skeleton from the prompt keywords."
                    tags={['default']}
                  />
                  {skeletons.map((skeleton) => (
                    <SkeletonCard
                      key={skeleton.id}
                      selected={skeletonId === skeleton.id}
                      onClick={() => setSkeletonId(skeleton.id)}
                      title={skeleton.name}
                      subtitle={`${skeleton.pattern} · ${skeleton.language}`}
                      description={skeleton.description}
                      tags={skeleton.skillAxes.slice(0, 3)}
                    />
                  ))}
                </div>
              </section>

              <section className="signal-panel rounded-[1.7rem] p-5 md:p-6">
                <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-primary">
                      <WandSparkles className="h-4 w-4" />
                      <p className="text-xs uppercase tracking-[0.32em]">Generation prompt</p>
                    </div>
                    <h2 className="text-xl leading-tight md:text-2xl">Keep it concrete.</h2>
                    <p className="max-w-sm text-sm leading-6 text-white/58">
                      Name the actual app, features, bugs, and expected scope. The generator works better with product details than abstract evaluation notes.
                    </p>

                    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-[11px] uppercase tracking-[0.26em] text-white/42">Summary preview</p>
                      <p className="mt-2 text-sm leading-6 text-white/66">
                        {derivedSummary || 'Summary will be derived from the prompt.'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] uppercase tracking-[0.26em] text-white/45">
                      Prompt
                    </label>
                    <Textarea
                      value={generationPrompt}
                      onChange={(event) => setGenerationPrompt(event.target.value)}
                      className="min-h-[260px] rounded-[1.35rem] border-white/10 bg-black/20 text-sm leading-7"
                      placeholder="Describe the role, stack, generated project, tests, and the candidate signals you want."
                    />
                  </div>
                </div>
              </section>

              <section className="signal-panel rounded-[1.6rem] p-5">
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">Generated metadata</p>
                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 py-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Title</p>
                    <p className="mt-2 text-lg text-white/88">
                      {derivedTitle || 'Generated Technical Assessment'}
                    </p>
                  </div>
                  <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 py-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Ready state</p>
                    <p className="mt-2 text-lg text-white/88">
                      {generationPrompt.trim().length >= 20 && Number(durationMinutes) ? 'Ready' : 'Needs input'}
                    </p>
                  </div>
                </div>
              </section>

              {error && <p className="text-sm text-red-300">{error}</p>}

              <div className="signal-panel flex flex-col gap-3 rounded-[1.6rem] p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="px-1 text-sm text-white/55">
                  Creating the assessment generates the repo, tests, and workspace candidates will open.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <LiquidButton
                    onClick={() => handleSubmit('draft')}
                    disabled={submitting !== null || compiledPrompt.trim().length < 20 || !Number(durationMinutes)}
                    variant="outline"
                    className="h-11 rounded-full px-5"
                  >
                    {submitting === 'draft' ? 'Generating draft...' : 'Save draft'}
                  </LiquidButton>
                  <LiquidButton
                    onClick={() => handleSubmit('published')}
                    disabled={
                      submitting !== null ||
                      compiledPrompt.trim().length < 20 ||
                      !Number(durationMinutes)
                    }
                    className="h-11 rounded-full px-5"
                  >
                    <SendHorizonal className="mr-2 h-4 w-4" />
                    {submitting === 'published' ? 'Generating and publishing...' : 'Publish and assign'}
                  </LiquidButton>
                </div>
              </div>
            </main>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard({
  selected,
  onClick,
  title,
  subtitle,
  description,
  tags,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-full flex-col rounded-[1.2rem] border px-4 py-4 text-left transition-colors ${
        selected
          ? 'border-primary/60 bg-primary/10'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
      }`}
    >
      <p className="text-[10px] uppercase tracking-[0.26em] text-white/42">{subtitle}</p>
      <p className="mt-2 text-sm text-white/88">{title}</p>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/55">{description}</p>
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/52"
            >
              {tag.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
