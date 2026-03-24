import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassNav from '@/components/GlassNav';
import LiquidButton from '@/components/LiquidButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Clock3, FileText, SendHorizonal } from 'lucide-react';

export default function CreateAssessment() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [instructionsMd, setInstructionsMd] = useState(
    `## Candidate brief

You are joining an existing product team. Work inside the provided repository and leave the codebase in a production-ready state.

### What we expect
- Keep behavior correct
- Explain tradeoffs in code comments only where needed
- Prefer small, defensible changes over broad rewrites

### Deliverable
Ship working code and leave the tests passing where possible.`,
  );
  const [durationMinutes, setDurationMinutes] = useState('90');
  const [submitting, setSubmitting] = useState<'draft' | 'published' | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      <div className="editorial-grid min-h-screen px-6 pb-16 pt-24">
        <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[0.9fr_1.2fr]">
          <section className="editorial-panel rounded-[2rem] p-8 md:p-10">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </button>

            <p className="mt-8 text-xs uppercase tracking-[0.45em] text-primary/80">
              Manual Authoring
            </p>
            <h1 className="mt-4 text-4xl leading-tight md:text-5xl">
              Build the assessment brief first. Automation can come later.
            </h1>
            <p className="mt-6 text-sm leading-7 text-white/62">
              This v1 path persists a real assessment record, publishes it when requested, and
              sends you directly into assignment management. The previously mocked GitHub, PRD,
              and AI generation modes are intentionally deferred.
            </p>

            <div className="mt-10 space-y-4">
              {[
                ['Brief', 'Title, context, and candidate instructions become the source of truth.'],
                ['Duration', 'Stored on the assessment and shown on the candidate dashboard.'],
                ['Publish state', 'Save as draft or publish immediately before sending invites.'],
              ].map(([label, description]) => (
                <div key={label} className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">{label}</p>
                  <p className="mt-2 text-sm text-white/68">{description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="editorial-panel rounded-[2rem] p-8 md:p-10">
            <div className="grid gap-6">
              <div>
                <label className="mb-3 block text-xs uppercase tracking-[0.35em] text-white/45">
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
                <label className="mb-3 block text-xs uppercase tracking-[0.35em] text-white/45">
                  Summary
                </label>
                <Textarea
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  placeholder="Short internal summary for hiring managers."
                  className="min-h-[120px] rounded-[1.5rem] border-white/10 bg-white/5"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-[1fr_180px]">
                <div>
                  <label className="mb-3 block text-xs uppercase tracking-[0.35em] text-white/45">
                    Candidate instructions
                  </label>
                  <Textarea
                    value={instructionsMd}
                    onChange={(event) => setInstructionsMd(event.target.value)}
                    className="min-h-[340px] rounded-[1.5rem] border-white/10 bg-white/5 font-mono text-sm"
                  />
                </div>
                <div className="space-y-4">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Clock3 className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-[0.3em]">Duration</span>
                    </div>
                    <Input
                      type="number"
                      min={15}
                      max={480}
                      value={durationMinutes}
                      onChange={(event) => setDurationMinutes(event.target.value)}
                      className="mt-4 h-12 rounded-xl border-white/10 bg-white/5"
                    />
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4 text-sm text-white/65">
                    <div className="flex items-center gap-2 text-primary">
                      <FileText className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-[0.3em]">Source</span>
                    </div>
                    <p className="mt-3 leading-6">
                      Manual authoring is the only active path in this implementation. Imported and
                      generated modes are intentionally held back.
                    </p>
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-red-300">{error}</p>}

              <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row">
                <LiquidButton
                  onClick={() => handleSubmit('draft')}
                  disabled={
                    submitting !== null ||
                    !title.trim() ||
                    !instructionsMd.trim() ||
                    !Number(durationMinutes)
                  }
                  variant="outline"
                  className="h-12 rounded-full px-6"
                >
                  {submitting === 'draft' ? 'Saving draft...' : 'Save draft'}
                </LiquidButton>
                <LiquidButton
                  onClick={() => handleSubmit('published')}
                  disabled={
                    submitting !== null ||
                    !title.trim() ||
                    !instructionsMd.trim() ||
                    !Number(durationMinutes)
                  }
                  className="h-12 rounded-full px-6"
                >
                  <SendHorizonal className="mr-2 h-4 w-4" />
                  {submitting === 'published' ? 'Publishing...' : 'Publish and assign'}
                </LiquidButton>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
