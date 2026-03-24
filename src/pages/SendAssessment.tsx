import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GlassNav from '@/components/GlassNav';
import LiquidButton from '@/components/LiquidButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, BarChart3, Copy, MailPlus, SendHorizonal } from 'lucide-react';

interface AssessmentDetail {
  id: string;
  title: string;
  summary: string;
  instructionsMd: string;
  durationMinutes: number;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

interface Assignment {
  id: string;
  candidateEmail: string;
  status: 'assigned' | 'claimed' | 'started' | 'completed' | 'expired';
  claimedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

const statusTone: Record<Assignment['status'], string> = {
  assigned: 'text-white/55',
  claimed: 'text-amber-300',
  started: 'text-primary',
  completed: 'text-emerald-300',
  expired: 'text-rose-300',
};

export default function SendAssessment() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;

    setError(null);
    try {
      const [assessmentRes, assignmentsRes] = await Promise.all([
        apiFetch(`/api/company/assessments/${id}`),
        apiFetch(`/api/company/assessments/${id}/assignments`),
      ]);

      if (!assessmentRes.ok || !assignmentsRes.ok) {
        throw new Error('Failed to load assessment');
      }

      const [assessmentData, assignmentsData] = await Promise.all([
        assessmentRes.json(),
        assignmentsRes.json(),
      ]);

      setAssessment(assessmentData);
      setAssignments(assignmentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment');
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const invitationLink = useMemo(() => {
    if (!id) return '';
    return `${window.location.origin}/candidate`;
  }, [id]);

  async function handlePublish() {
    if (!id) return;
    setPublishing(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/company/assessments/${id}/publish`, {
        method: 'POST',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to publish assessment');
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish assessment');
    } finally {
      setPublishing(false);
    }
  }

  async function handleAssign() {
    if (!id) return;
    setSaving(true);
    setError(null);

    const emails = emailInput
      .split(/[\n,]/)
      .map((email) => email.trim())
      .filter(Boolean);

    try {
      const res = await apiFetch(`/api/company/assessments/${id}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to assign assessment');
      }

      setEmailInput('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign assessment');
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(invitationLink);
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlassNav variant="company" />
      <div className="editorial-grid min-h-screen px-6 pb-16 pt-24">
        <div className="mx-auto max-w-7xl">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <div className="editorial-panel rounded-[2rem] p-8 md:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.45em] text-primary/80">
                    Assignment Studio
                  </p>
                  <h1 className="mt-4 text-4xl md:text-5xl">{assessment.title}</h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/62">
                    {assessment.summary || 'No internal summary yet. The candidate brief below is the active source of truth.'}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/4 px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">{assessment.status}</p>
                  <p className="mt-2 text-lg">{assessment.durationMinutes} min</p>
                </div>
              </div>

              <div className="mt-8 rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/45">Candidate brief</p>
                <pre className="mt-4 whitespace-pre-wrap font-mono text-sm leading-7 text-white/70">
                  {assessment.instructionsMd}
                </pre>
              </div>
            </div>

            <div className="space-y-6">
              <div className="editorial-panel rounded-[2rem] p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-white/45">Status</p>
                    <p className="mt-2 text-2xl capitalize">{assessment.status}</p>
                  </div>
                  {assessment.status !== 'published' && (
                    <LiquidButton
                      onClick={handlePublish}
                      disabled={publishing}
                      className="h-11 rounded-full px-5"
                    >
                      {publishing ? 'Publishing...' : 'Publish'}
                    </LiquidButton>
                  )}
                </div>
                <p className="mt-4 text-sm text-white/60">
                  Candidates can still be assigned while this is a draft, but publishing makes the
                  intended state explicit for your team.
                </p>
              </div>

              <div className="editorial-panel rounded-[2rem] p-8">
                <p className="text-xs uppercase tracking-[0.35em] text-white/45">Candidate entry</p>
                <div className="mt-4 flex gap-3">
                  <Input
                    value={invitationLink}
                    readOnly
                    className="h-12 rounded-full border-white/10 bg-white/5"
                  />
                  <button
                    onClick={copyLink}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 text-sm text-white/58">
                  Candidates must sign in with the assigned email address to claim the assessment.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="editorial-panel rounded-[2rem] p-8">
              <div className="flex items-center gap-3 text-primary">
                <MailPlus className="h-5 w-5" />
                <p className="text-xs uppercase tracking-[0.35em]">Assign by email</p>
              </div>
              <p className="mt-4 text-sm leading-7 text-white/62">
                Paste one email per line, or separate multiple addresses with commas. Duplicate
                emails for the same assessment are skipped.
              </p>
              <Textarea
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                placeholder={'candidate.one@company.com\ncandidate.two@company.com'}
                className="mt-6 min-h-[220px] rounded-[1.5rem] border-white/10 bg-white/5"
              />
              <LiquidButton
                onClick={handleAssign}
                disabled={saving || !emailInput.trim()}
                className="mt-5 h-12 w-full rounded-full"
              >
                <SendHorizonal className="mr-2 h-4 w-4" />
                {saving ? 'Assigning...' : 'Create assignments'}
              </LiquidButton>
              {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
            </div>

            <div className="editorial-panel rounded-[2rem] p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/45">Assignments</p>
                  <h2 className="mt-3 text-3xl">{assignments.length} candidates tracked</h2>
                </div>
                <button
                  onClick={() => navigate(`/dashboard/assessments/${id}/results`)}
                  className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
                >
                  <BarChart3 className="h-4 w-4" />
                  View all results
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-white">{assignment.candidateEmail}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.25em] text-white/38">
                          {new Date(assignment.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={`text-xs uppercase tracking-[0.3em] ${statusTone[assignment.status]}`}>
                        {assignment.status}
                      </span>
                    </div>
                  </div>
                ))}
                {assignments.length === 0 && (
                  <div className="rounded-[1.5rem] border border-dashed border-white/10 p-8 text-center text-sm text-white/52">
                    No assignments yet. Create one or more email-based invitations to activate this assessment.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
