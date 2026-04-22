import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GlassNav from '@/components/GlassNav';
import LiquidButton from '@/components/LiquidButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';
import { parseAssessmentBrief, partLabel } from '@/lib/assessmentBrief';
import { ArrowLeft, BarChart3, Copy, MailPlus, Pencil, SendHorizonal } from 'lucide-react';

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
  workspaceFileCount: number;
  workspaceEntryFile: string | null;
  workspaceGeneratedAt: string | null;
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
  const [lastInviteResult, setLastInviteResult] = useState<{ created: number; emailsSent: number } | null>(null);

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
    return `${window.location.origin}/candidate`;
  }, []);
  const briefSections = useMemo(
    () => parseAssessmentBrief(assessment?.instructionsMd ?? ''),
    [assessment?.instructionsMd],
  );

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

      const result = await res.json() as { created: number; emailsSent?: number };
      setLastInviteResult({ created: result.created, emailsSent: result.emailsSent ?? 0 });
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
        <div className="mx-auto w-full max-w-6xl">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>

          <section className="mt-6 editorial-panel rounded-[1.75rem] p-6 md:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-[11px] uppercase tracking-[0.38em] text-primary/80">
                    Assignment Studio
                  </p>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/60">
                    {assessment.status}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/60">
                    {assessment.durationMinutes} min
                  </span>
                </div>
                <h1 className="mt-4 text-3xl leading-tight md:text-4xl">{assessment.title}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
                  {assessment.summary || 'No internal summary yet. The candidate brief below is the active source of truth.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate(`/dashboard/assessments/${assessment.id}/editor`)}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-sm text-white/70 transition-colors hover:bg-white/10"
                >
                  <Pencil className="h-4 w-4" />
                  Edit assessment
                </button>
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
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">Workspace</p>
                <p className="mt-2 text-xl">{assessment.workspaceFileCount} files</p>
                <p className="mt-1 text-xs text-white/48">
                  {assessment.workspaceEntryFile || 'Entry inferred from generated repo'}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">Candidate entry</p>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={invitationLink}
                    readOnly
                    className="h-10 rounded-full border-white/10 bg-white/5 text-xs"
                  />
                  <button
                    onClick={copyLink}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">Generated</p>
                <p className="mt-2 text-sm text-white/72">
                  {assessment.workspaceGeneratedAt
                    ? new Date(assessment.workspaceGeneratedAt).toLocaleString()
                    : 'Not available'}
                </p>
                <p className="mt-1 text-xs text-white/48">Review the repo before sending.</p>
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-5">
              {(briefSections.companyCodebase || briefSections.parts.some(Boolean)) ? (
                <div className="editorial-panel rounded-[1.6rem] p-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-white/45">
                      Implementation scope
                    </p>
                    <p className="mt-2 text-sm text-white/55">
                      Reviewer context for the repo and each part of the sprint.
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {(
                      [
                        ['Company codebase', briefSections.companyCodebase],
                        ...briefSections.parts.map(
                          (content, index) => [partLabel(index), content] as const,
                        ),
                      ] as Array<readonly [string, string]>
                    ).map(([label, value]) =>
                      value ? (
                        <div
                          key={label}
                          className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 py-4"
                        >
                          <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">{label}</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/74">
                            {value}
                          </p>
                        </div>
                      ) : null,
                    )}
                  </div>
                </div>
              ) : null}

              <div className="editorial-panel rounded-[1.6rem] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-white/45">Candidate brief</p>
                    <p className="mt-2 text-sm text-white/55">What the candidate sees as the source of truth.</p>
                  </div>
                  <button
                    onClick={() => navigate(`/dashboard/assessments/${assessment.id}/editor`)}
                    className="inline-flex items-center gap-2 text-sm text-primary transition-colors hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit code
                  </button>
                </div>
                <div className="mt-4 rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
                  <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap font-mono text-[13px] leading-6 text-white/70">
                    {assessment.instructionsMd}
                  </pre>
                </div>
              </div>

              <div className="editorial-panel rounded-[1.6rem] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-white/45">Assignments</p>
                    <h2 className="mt-2 text-2xl">{assignments.length} tracked</h2>
                  </div>
                  <button
                    onClick={() => navigate(`/dashboard/assessments/${id}/results`)}
                    className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Results
                  </button>
                </div>

                <div className="mt-5 space-y-2.5">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="rounded-[1.1rem] border border-white/8 bg-white/[0.04] px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-white">{assignment.candidateEmail}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/38">
                            {new Date(assignment.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span className={`text-[11px] uppercase tracking-[0.28em] ${statusTone[assignment.status]}`}>
                          {assignment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {assignments.length === 0 && (
                    <div className="rounded-[1.2rem] border border-dashed border-white/10 p-6 text-center text-sm text-white/52">
                      No assignments yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="editorial-panel rounded-[1.6rem] p-5">
              <div className="flex items-center gap-3 text-primary">
                <MailPlus className="h-4 w-4" />
                <p className="text-xs uppercase tracking-[0.32em]">Assign by email</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/62">
                Paste one email per line or separate addresses with commas. Duplicates are skipped.
              </p>
              <Textarea
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                placeholder={'candidate.one@company.com\ncandidate.two@company.com'}
                className="mt-4 min-h-[180px] rounded-[1.3rem] border-white/10 bg-white/5"
              />
              <LiquidButton
                onClick={handleAssign}
                disabled={saving || !emailInput.trim()}
                className="mt-4 h-11 w-full rounded-full"
              >
                <SendHorizonal className="mr-2 h-4 w-4" />
                {saving ? 'Sending...' : 'Create assignments & send emails'}
              </LiquidButton>
              {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
              {lastInviteResult && !error && (
                <div className="mt-4 rounded-[1.1rem] border border-emerald-500/20 bg-emerald-500/8 px-4 py-3">
                  <p className="text-sm text-emerald-300">
                    {lastInviteResult.created} assignment{lastInviteResult.created !== 1 ? 's' : ''} created
                    {lastInviteResult.emailsSent > 0
                      ? ` · ${lastInviteResult.emailsSent} invite email${lastInviteResult.emailsSent !== 1 ? 's' : ''} sent`
                      : ' · configure RESEND_API_KEY to send emails'}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
