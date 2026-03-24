import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Clock3, LogOut, Building2 } from 'lucide-react';

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

const statusCopy: Record<CandidateAssignment['status'], string> = {
  assigned: 'Ready to claim',
  claimed: 'Ready to start',
  started: 'In progress',
  completed: 'Submitted',
  expired: 'Closed',
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
      open: assignments.filter((assignment) =>
        ['assigned', 'claimed', 'started'].includes(assignment.status),
      ).length,
      completed: assignments.filter((assignment) => assignment.status === 'completed').length,
      companies: new Set(assignments.map((assignment) => assignment.company?.id).filter(Boolean)).size,
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="editorial-grid min-h-screen px-6 pb-12 pt-10">
        <div className="mx-auto max-w-7xl">
          <header className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <section className="editorial-panel rounded-[2rem] p-8 md:p-10">
              <p className="text-xs uppercase tracking-[0.45em] text-primary/80">Candidate Home</p>
              <h1 className="mt-4 max-w-3xl text-4xl leading-tight md:text-6xl">
                Every assigned assessment lives here, tied to your signed-in email.
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-7 text-white/60">
                Sign in with the same email a company assigned, and the assessment is claimed inside
                your account automatically.
              </p>
            </section>

            <section className="editorial-panel rounded-[2rem] p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Account</p>
                  <p className="mt-3 text-lg">{user?.email}</p>
                </div>
                <button
                  onClick={signOut}
                  className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  ['Open', stats.open],
                  ['Completed', stats.completed],
                  ['Companies', stats.companies],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[1.35rem] border border-white/8 bg-white/4 p-4 text-center">
                    <p className="text-2xl">{value}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-white/40">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </header>

          {loading && (
            <div className="mt-8 flex justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {error && <p className="mt-6 text-sm text-red-300">{error}</p>}

          {!loading && assignments.length === 0 && (
            <section className="mt-8 editorial-panel rounded-[2rem] p-10 text-center">
              <Building2 className="mx-auto h-8 w-8 text-white/35" />
              <h2 className="mt-5 text-3xl">No assessments assigned yet.</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-white/55">
                Once a company assigns an assessment to this email address, it will appear here automatically after sign-in.
              </p>
            </section>
          )}

          <section className="mt-8 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {assignments.map((assignment) => {
              const startable = ['assigned', 'claimed'].includes(assignment.status);
              const sessionInProgress =
                assignment.session &&
                ['starting', 'running', 'disconnected'].includes(assignment.session.status);

              return (
                <article key={assignment.id} className="editorial-panel rounded-[2rem] p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/55">
                      {statusCopy[assignment.status]}
                    </span>
                    <div className="inline-flex items-center gap-2 text-sm text-white/48">
                      <Clock3 className="h-4 w-4" />
                      {assignment.assessment?.durationMinutes ?? '??'} min
                    </div>
                  </div>

                  <p className="mt-6 text-xs uppercase tracking-[0.3em] text-primary/80">
                    {assignment.company?.name ?? 'Company'}
                  </p>
                  <h2 className="mt-3 text-3xl leading-tight">
                    {assignment.assessment?.title ?? 'Assessment'}
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-white/62">
                    {assignment.assessment?.summary || 'No summary provided.'}
                  </p>

                  <div className="mt-8 border-t border-white/8 pt-5">
                    {startable && (
                      <button
                        onClick={() => handleStart(assignment.id)}
                        disabled={startingId === assignment.id}
                        className="inline-flex items-center gap-2 text-sm text-primary transition-colors hover:text-white"
                      >
                        {startingId === assignment.id ? 'Starting...' : 'Start assessment'}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}

                    {sessionInProgress && assignment.session && (
                      <button
                        onClick={() => navigate(`/session/${assignment.session?.id}`)}
                        className="inline-flex items-center gap-2 text-sm text-primary transition-colors hover:text-white"
                      >
                        Resume session
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}

                    {assignment.status === 'completed' && (
                      <p className="text-sm text-emerald-300">
                        Completed {assignment.completedAt ? new Date(assignment.completedAt).toLocaleString() : ''}
                      </p>
                    )}

                    {assignment.status === 'expired' && (
                      <p className="text-sm text-rose-300">
                        This assignment is no longer startable.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      </div>
    </div>
  );
}
