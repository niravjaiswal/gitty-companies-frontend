import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassNav from '@/components/GlassNav';
import LiquidButton from '@/components/LiquidButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Clock3, SendHorizonal, Sparkles, WandSparkles } from 'lucide-react';

const DEFAULT_PROMPT = `Role: Senior Frontend Engineer

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
  const [generationPrompt, setGenerationPrompt] = useState(DEFAULT_PROMPT);
  const [durationMinutes, setDurationMinutes] = useState('90');
  const [submitting, setSubmitting] = useState<'draft' | 'published' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const derivedTitle = deriveAssessmentTitle(generationPrompt);
  const derivedSummary = deriveAssessmentSummary(generationPrompt);

  async function handleSubmit(status: 'draft' | 'published') {
    setSubmitting(status);
    setError(null);

    try {
      const trimmedPrompt = generationPrompt.trim();
      const res = await apiFetch('/api/company/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: derivedTitle,
          summary: derivedSummary,
          instructionsMd: trimmedPrompt,
          durationMinutes: Number(durationMinutes),
          sourceBrief: trimmedPrompt,
          authoringConfig: {
            mode: 'single',
            stages: [],
          },
          status,
          generateWorkspace: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to create assessment workspace');
      }

      const assessment = await res.json();
      navigate(`/dashboard/send/${assessment.id}`);
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
                <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-primary">
                      <WandSparkles className="h-4 w-4" />
                      <p className="text-xs uppercase tracking-[0.32em]">Generation prompt</p>
                    </div>
                    <h2 className="text-xl leading-tight md:text-2xl">
                      Keep it concrete.
                    </h2>
                    <p className="max-w-sm text-sm leading-6 text-white/58">
                      Name the actual app, features, bugs, and expected scope. The generator works
                      better with product details than abstract evaluation notes.
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
                      className="min-h-[520px] rounded-[1.35rem] border-white/10 bg-black/20 text-sm leading-7"
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
                    disabled={submitting !== null || generationPrompt.trim().length < 20 || !Number(durationMinutes)}
                    variant="outline"
                    className="h-11 rounded-full px-5"
                  >
                    {submitting === 'draft' ? 'Generating draft...' : 'Save draft'}
                  </LiquidButton>
                  <LiquidButton
                    onClick={() => handleSubmit('published')}
                    disabled={submitting !== null || generationPrompt.trim().length < 20 || !Number(durationMinutes)}
                    className="h-11 rounded-full px-5"
                  >
                    <SendHorizonal className="mr-2 h-4 w-4" />
                    {submitting === 'published' ? 'Generating and publishing...' : 'Publish and assign'}
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
