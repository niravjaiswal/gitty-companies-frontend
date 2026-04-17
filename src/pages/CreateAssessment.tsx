import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassNav from '@/components/GlassNav';
import LiquidButton from '@/components/LiquidButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { apiFetch } from '@/lib/api';
import { buildAssessmentBrief } from '@/lib/assessmentBrief';
import { ArrowLeft, Clock3, Library, SendHorizonal, Sparkles, WandSparkles, Zap } from 'lucide-react';

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

function buildInstantPreset(role: string, githubUrl: string) {
  const cleanRole = role.trim() || 'Senior Engineer';
  const cleanUrl = githubUrl.trim() || 'https://github.com/gitty-ai/gitty';

  return {
    overview: `You are hiring a ${cleanRole} and want a realistic Gitty sprint built from a real company repo.

The candidate should step into an existing React + TypeScript product surface, understand how the current flow works, and ship the missing feature in a way that feels production-ready rather than toy-assessment ready.`,
    codebase: `Company repo: ${cleanUrl}
Access: request repository access if the org repo is private before starting the sprint.
Scenario: Gitty needs to ingest this codebase into the assessment flow and keep that repo context visible from setup to candidate execution to reviewer handoff.`,
    partA: `Implement the company-codebase intake flow for ${cleanRole}.

- Add a dedicated GitHub repository input in the assessment setup flow
- Validate and normalize the repository URL before accepting it
- Show a persistent repo summary card after the repo is connected
- Carry the selected company codebase into the candidate brief and generated assessment metadata
- Add or update tests so this behavior is verified`,
    partB: `Implement the reviewer handoff for the same Gitty sprint.

- Add a company-facing review panel that shows the linked codebase, expected implementation scope, and shipped result
- Surface a concise acceptance checklist tied to Part A so reviewers can compare intent vs implementation fast
- Keep the UX coherent with the existing product and leave the code in a review-friendly state`,
  };
}

const LIVE_PROMPT = `Role: Senior Frontend Engineer

Generate a realistic coding assessment as a runnable project the candidate can open in VS Code.

I want a React + TypeScript + Vite app with a real product surface, clear feature requirements, and one or two failing tests. The candidate should inherit an existing codebase, debug issues, finish one incomplete feature, and leave the tests passing.

Make the assessment feel like an actual product build, not a toy app. For example, if this is frontend, create something creative like a Firebase-authenticated React app with a polished feature loop such as a Wordle-style daily challenge, collaborative UI, or a small product dashboard. If this is a Rust role, create a creative Rust implementation such as a TUI tool, event processor, realtime service, or systems-style mini product.

Focus on:
- strong React fundamentals
- debugging existing code
- good component structure
- practical product decisions
- clear README and setup steps
- a generated repository with actual source files, app logic, and tests instead of only sandbox/bootstrap files`;

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
  const initialPreset = buildInstantPreset('', '');
  const [generationPrompt, setGenerationPrompt] = useState(initialPreset.overview);
  const [durationMinutes, setDurationMinutes] = useState('90');
  const [demoMode, setDemoMode] = useState(true);
  const [demoCandidateEmail, setDemoCandidateEmail] = useState('candidate@demo.dev');
  const [companyCodebase, setCompanyCodebase] = useState(initialPreset.codebase);
  const [partA, setPartA] = useState(initialPreset.partA);
  const [partB, setPartB] = useState(initialPreset.partB);
  const [intakeRepoUrl, setIntakeRepoUrl] = useState('');
  const [intakeRole, setIntakeRole] = useState('');
  const [builderReady, setBuilderReady] = useState(false);
  const [isGeneratingPreset, setIsGeneratingPreset] = useState(false);
  const [submitting, setSubmitting] = useState<'draft' | 'published' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skeletons, setSkeletons] = useState<SkeletonListItem[]>([]);
  const [skeletonId, setSkeletonId] = useState<string | null>(null);

  const compiledPrompt = useMemo(
    () =>
      demoMode
        ? buildAssessmentBrief({
            overview: generationPrompt,
            companyCodebase,
            partA,
            partB,
          })
        : generationPrompt,
    [companyCodebase, demoMode, generationPrompt, partA, partB],
  );

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

  useEffect(() => {
    setGenerationPrompt((current) => {
      if (demoMode && current === LIVE_PROMPT) {
        return buildInstantPreset(intakeRole, intakeRepoUrl).overview;
      }
      if (!demoMode && current === buildInstantPreset(intakeRole, intakeRepoUrl).overview) {
        return LIVE_PROMPT;
      }
      return current;
    });
  }, [demoMode, intakeRepoUrl, intakeRole]);

  function startGeneratedBuilder() {
    const preset = buildInstantPreset(intakeRole, intakeRepoUrl);
    setIsGeneratingPreset(true);
    setError(null);

    window.setTimeout(() => {
      setGenerationPrompt(preset.overview);
      setCompanyCodebase(preset.codebase);
      setPartA(preset.partA);
      setPartB(preset.partB);
      setBuilderReady(true);
      setIsGeneratingPreset(false);
    }, 1400);
  }

  async function handleSubmit(status: 'draft' | 'published') {
    setSubmitting(status);
    setError(null);

    try {
      const trimmedPrompt = compiledPrompt.trim();
      const res = await apiFetch('/api/company/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: derivedTitle,
          summary: derivedSummary,
          instructionsMd: trimmedPrompt,
          durationMinutes: Number(durationMinutes),
          sourceBrief: trimmedPrompt,
          skeletonId: !demoMode && skeletonId ? skeletonId : undefined,
          authoringConfig: {
            mode: 'single',
            stages: [],
          },
          status,
          generateWorkspace: true,
          demoMode,
          demoCandidateEmail: demoMode ? demoCandidateEmail.trim() : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to create assessment workspace');
      }

      const assessment = await res.json();
      const destination =
        !demoMode && assessment.generationStatus === 'pending'
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
                    Start from the company repo, then generate the sprint.
                  </h1>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-white/60">
                    Answer two setup questions. Then Gitty will generate the assessment brief, repo context, and reviewer flow for you.
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
                          1. Company GitHub codebase
                        </label>
                        <Textarea
                          value={intakeRepoUrl}
                          onChange={(event) => setIntakeRepoUrl(event.target.value)}
                          className="min-h-[120px] rounded-[1.25rem] border-white/10 bg-white/5 text-sm leading-7"
                          placeholder="Paste the GitHub repo URL and any access note if the repo is private."
                        />
                        <p className="mt-2 text-sm text-white/50">
                          Example: `https://github.com/acme/platform-web` and mention if repo access must be granted before the candidate starts.
                        </p>
                      </div>

                      <div>
                        <label className="mb-2 block text-[11px] uppercase tracking-[0.26em] text-white/45">
                          2. Role you are hiring for
                        </label>
                        <Input
                          value={intakeRole}
                          onChange={(event) => setIntakeRole(event.target.value)}
                          className="h-12 rounded-[1.1rem] border-white/10 bg-white/5"
                          placeholder="Senior Frontend Engineer"
                        />
                      </div>

                      <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-[11px] uppercase tracking-[0.26em] text-white/42">What Gitty will generate</p>
                        <div className="mt-3 space-y-2 text-sm leading-6 text-white/62">
                          <p>Role-specific sprint brief</p>
                          <p>Repo-aware candidate instructions</p>
                          <p>Part A and Part B implementation scope</p>
                          <p>Reviewer-ready handoff panels</p>
                        </div>
                      </div>

                      <LiquidButton
                        onClick={startGeneratedBuilder}
                        disabled={!intakeRepoUrl.trim() || !intakeRole.trim()}
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
                  <Zap className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-[0.32em]">Instant workspace</p>
                </div>
                <div className="mt-4 rounded-[1.2rem] border border-orange-400/15 bg-orange-400/8 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/86">Fast polished assessment path</p>
                      <p className="mt-2 text-sm leading-6 text-white/58">
                        Uses a prebuilt launch dashboard workspace, generates fast, and can auto-seed a candidate assignment for the video flow.
                      </p>
                    </div>
                    <Switch checked={demoMode} onCheckedChange={setDemoMode} />
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-[11px] uppercase tracking-[0.26em] text-white/45">
                      Seed candidate email
                    </label>
                    <Input
                      value={demoCandidateEmail}
                      onChange={(event) => setDemoCandidateEmail(event.target.value)}
                      className="h-11 rounded-[1rem] border-white/10 bg-white/5"
                      disabled={!demoMode}
                    />
                  </div>
                </div>
              </section>

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
              {!demoMode && (
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
              )}

              <section className="signal-panel rounded-[1.7rem] p-5 md:p-6">
                <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-primary">
                      <WandSparkles className="h-4 w-4" />
                      <p className="text-xs uppercase tracking-[0.32em]">
                        {demoMode ? 'Assessment brief' : 'Generation prompt'}
                      </p>
                    </div>
                    <h2 className="text-xl leading-tight md:text-2xl">
                      {demoMode ? 'Ship the fast assessment path.' : 'Keep it concrete.'}
                    </h2>
                    <p className="max-w-sm text-sm leading-6 text-white/58">
                      {demoMode
                        ? 'This mode skips the slow repo generator and uses a fixed launch dashboard workspace with a clean run/test/submit flow.'
                        : 'Name the actual app, features, bugs, and expected scope. The generator works better with product details than abstract evaluation notes.'}
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
                      {demoMode ? 'Assessment overview' : 'Prompt'}
                    </label>
                    <Textarea
                      value={generationPrompt}
                      onChange={(event) => setGenerationPrompt(event.target.value)}
                      className="min-h-[260px] rounded-[1.35rem] border-white/10 bg-black/20 text-sm leading-7"
                      placeholder={
                        demoMode
                          ? 'Describe the product context the candidate is stepping into.'
                          : 'Describe the role, stack, generated project, tests, and the candidate signals you want.'
                      }
                    />

                    {demoMode ? (
                      <div className="mt-5 grid gap-4">
                        <div>
                          <label className="mb-2 block text-[11px] uppercase tracking-[0.26em] text-white/45">
                            Company codebase
                          </label>
                          <Textarea
                            value={companyCodebase}
                            onChange={(event) => setCompanyCodebase(event.target.value)}
                            className="min-h-[112px] rounded-[1.2rem] border-white/10 bg-black/20 text-sm leading-7"
                            placeholder="Reference repo name, URL, and the implementation context candidates should inherit."
                          />
                        </div>

                        <div className="grid gap-4 xl:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-[11px] uppercase tracking-[0.26em] text-white/45">
                              Part A
                            </label>
                            <Textarea
                              value={partA}
                              onChange={(event) => setPartA(event.target.value)}
                              className="min-h-[170px] rounded-[1.2rem] border-white/10 bg-black/20 text-sm leading-7"
                              placeholder="Primary implementation scope."
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-[11px] uppercase tracking-[0.26em] text-white/45">
                              Part B
                            </label>
                            <Textarea
                              value={partB}
                              onChange={(event) => setPartB(event.target.value)}
                              className="min-h-[170px] rounded-[1.2rem] border-white/10 bg-black/20 text-sm leading-7"
                              placeholder="Follow-up improvement or extension."
                            />
                          </div>
                        </div>

                        <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
                          <p className="text-[11px] uppercase tracking-[0.26em] text-white/42">
                            Candidate brief preview
                          </p>
                          <pre className="mt-3 max-h-[280px] overflow-auto whitespace-pre-wrap font-mono text-[12px] leading-6 text-white/66">
                            {compiledPrompt}
                          </pre>
                        </div>
                      </div>
                    ) : null}
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
                      !Number(durationMinutes) ||
                      (demoMode && !demoCandidateEmail.trim())
                    }
                    className="h-11 rounded-full px-5"
                  >
                    <SendHorizonal className="mr-2 h-4 w-4" />
                    {submitting === 'published'
                      ? demoMode
                        ? 'Building workspace and assigning...'
                        : 'Generating and publishing...'
                      : demoMode
                        ? 'Build workspace and assign'
                        : 'Publish and assign'}
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
