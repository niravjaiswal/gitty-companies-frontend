import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import GlassNav from '@/components/GlassNav';
import { ArrowRight, Clock3, Building2, CheckCircle2, AlertCircle, Loader2, Circle } from 'lucide-react';

interface CandidateAssignment {
  id: string;
  status: 'assigned' | 'claimed' | 'started' | 'completed' | 'expired';
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  assessment: {
    id: string;
    title: string;
    summary: string;
    instructionsMd: string;
    durationMinutes: number;
    status: 'draft' | 'published' | 'archived';
  } | null;
  company: {
    id: string;
    name: string;
  } | null;
  session: {
    id: string;
    status: string;
    createdAt: string;
    stoppedAt: string | null;
  } | null;
}

const statusConfig: Record<
  CandidateAssignment['status'],
  { label: string; color: string; icon: typeof Circle }
> = {
  assigned: { label: 'Ready to claim', color: 'text-amber-400 border-amber-400/25 bg-amber-400/8', icon: Circle },
  claimed: { label: 'Ready to start', color: 'text-primary border-primary/25 bg-primary/8', icon: Circle },
  started: { label: 'In progress', color: 'text-sky-400 border-sky-400/25 bg-sky-400/8', icon: Loader2 },
  completed: { label: 'Submitted', color: 'text-emerald-400 border-emerald-400/25 bg-emerald-400/8', icon: CheckCircle2 },
  expired: { label: 'Closed', color: 'text-white/40 border-white/10 bg-white/4', icon: AlertCircle },
};

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<CandidateAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadAssignments() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/candidate/assignments');
      if (!res.ok) {
        throw new Error('Failed to load assignments');
      }

      const data = (await res.json()) as CandidateAssignment[];
      const active = data.find(
        (assignment) =>
          assignment.session &&
          ['starting', 'running', 'disconnected'].includes(assignment.session.status),
      );
      if (active?.session) {
        navigate(`/session/${active.session.id}`, { replace: true });
        return;
      }

      setAssignments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssignments();
  }, []);

  const stats = useMemo(() => {
    return {
      open: assignments.filter((a) => ['assigned', 'claimed', 'started'].includes(a.status)).length,
      completed: assignments.filter((a) => a.status === 'completed').length,
      companies: new Set(assignments.map((a) => a.company?.id).filter(Boolean)).size,
    };
  }, [assignments]);

  async function handleStart(assignmentId: string) {
    setStartingId(assignmentId);
    setError(null);

    try {
      const res = await apiFetch(`/api/candidate/assignments/${assignmentId}/start`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to start assessment');
      }

      const body = await res.json();
      navigate(`/session/${body.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start assessment');
      setStartingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Animated grid background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="gitty-grid-plane gitty-grid-plane-a" />
        <div className="gitty-grid-plane gitty-grid-plane-b" />
      </div>

      <GlassNav variant="applicant" />

      <main className="relative z-10 px-6 pb-16 pt-24">
        <div className="mx-auto max-w-6xl">

          {/* ── Header row ── */}
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="editorial-panel rounded-[1.35rem] p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-primary/80">
                    My Assessments
                  </p>
                  <h1 className="mt-2 text-2xl leading-tight md:text-3xl">
                    {user?.email?.split('@')[0]}'s dashboard
                  </h1>
                </div>

                {/* Inline stats */}
                <div className="flex items-center gap-3">
                  {([
                    ['Open', stats.open],
                    ['Done', stats.completed],
                    ['Companies', stats.companies],
                  ] as const).map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-[0.95rem] border border-white/8 bg-white/[0.04] px-4 py-2.5 text-center"
                    >
                      <p className="text-xl leading-none">{value}</p>
                      <p className="mt-1.5 text-[10px] uppercase tracking-[0.22em] text-white/40">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="editorial-panel rounded-[1.35rem] p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">Account</p>
                <button
                  onClick={signOut}
                  className="text-sm text-white/55 transition-colors hover:text-white"
                >
                  Sign out
                </button>
              </div>
              <p className="mt-3 truncate text-base text-white/80">{user?.email}</p>
              <p className="mt-1 text-xs text-white/35">
                Assessments are linked to this email automatically.
              </p>
            </div>
          </section>

          {error && (
            <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/8 px-5 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* ── Empty state ── */}
          {!loading && assignments.length === 0 && (
            <section className="mt-6 editorial-panel rounded-[1.35rem] p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04]">
                <Building2 className="h-6 w-6 text-white/30" />
              </div>
              <h2 className="mt-6 text-2xl">Nothing here yet</h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/50">
                When a company assigns an assessment to your email, it will
                show up here automatically — no action needed on your end.
              </p>
            </section>
          )}

          {/* ── Assessments table ── */}
          {assignments.length > 0 && (
            <section className="mt-6 editorial-panel overflow-hidden rounded-[1.35rem]">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_140px_100px_160px] items-center gap-4 border-b border-white/8 px-6 py-3 text-[10px] uppercase tracking-[0.28em] text-white/35 md:grid-cols-[1fr_180px_140px_100px_160px]">
                <span>Assessment</span>
                <span className="hidden md:block">Company</span>
                <span>Status</span>
                <span>Duration</span>
                <span className="text-right">Action</span>
              </div>

              {/* Rows */}
              {assignments.map((assignment) => {
                const config = statusConfig[assignment.status];
                const StatusIcon = config.icon;
                const startable = ['assigned', 'claimed'].includes(assignment.status);
                const sessionInProgress =
                  assignment.session &&
                  ['starting', 'running', 'disconnected'].includes(assignment.session.status);

                return (
                  <div
                    key={assignment.id}
                    className="group grid grid-cols-[1fr_140px_100px_160px] items-center gap-4 border-b border-white/[0.04] px-6 py-4 transition-colors last:border-0 hover:bg-white/[0.02] md:grid-cols-[1fr_180px_140px_100px_160px]"
                  >
                    {/* Title + summary */}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white/90">
                        {assignment.assessment?.title ?? 'Assessment'}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-white/40 md:hidden">
                        {assignment.company?.name ?? 'Company'}
                      </p>
                    </div>

                    {/* Company */}
                    <p className="hidden truncate text-xs text-white/50 md:block">
                      {assignment.company?.name ?? 'Company'}
                    </p>

                    {/* Status badge */}
                    <span
                      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${config.color}`}
                    >
                      <StatusIcon className={`h-3 w-3 shrink-0 ${assignment.status === 'started' ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">{config.label}</span>
                    </span>

                    {/* Duration */}
                    <span className="inline-flex items-center gap-1.5 text-xs text-white/40">
                      <Clock3 className="h-3.5 w-3.5 shrink-0" />
                      {assignment.assessment?.durationMinutes ?? '??'} min
                    </span>

                    {/* Action */}
                    <div className="flex justify-end">
                      {startable && (
                        <button
                          onClick={() => handleStart(assignment.id)}
                          disabled={startingId === assignment.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_8px_20px_rgba(255,103,16,0.18)] transition-all hover:scale-[1.03] hover:shadow-[0_8px_24px_rgba(255,103,16,0.28)] active:scale-[0.98] disabled:opacity-40"
                        >
                          {startingId === assignment.id ? 'Starting...' : 'Start'}
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}

                      {sessionInProgress && assignment.session && (
                        <button
                          onClick={() => navigate(`/session/${assignment.session?.id}`)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_8px_20px_rgba(255,103,16,0.18)] transition-all hover:scale-[1.03] hover:shadow-[0_8px_24px_rgba(255,103,16,0.28)] active:scale-[0.98]"
                        >
                          Resume
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}

                      {assignment.status === 'completed' && (
                        <span className="text-xs text-emerald-400/70">
                          {assignment.completedAt
                            ? new Date(assignment.completedAt).toLocaleDateString()
                            : 'Submitted'}
                        </span>
                      )}

                      {assignment.status === 'expired' && (
                        <span className="text-xs text-white/30">Expired</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
