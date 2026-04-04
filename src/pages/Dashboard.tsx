import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassNav from '@/components/GlassNav';
import LiquidButton from '@/components/LiquidButton';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import Tilt3D from '@/components/Tilt3D';

interface CompanyInfo {
  company: {
    id: string;
    name: string;
    createdAt: string;
  };
  membership: {
    companyId: string;
    role: string;
  };
}

interface AssessmentSummary {
  id: string;
  title: string;
  summary: string;
  durationMinutes: number;
  status: 'draft' | 'published' | 'archived';
  publishedAt: string | null;
  createdAt: string;
  assignmentCount: number;
  completedCount: number;
  inProgressCount: number;
  workspaceFileCount: number;
}

const STATUS_STYLES: Record<AssessmentSummary['status'], string> = {
  published: 'badge-published',
  draft: 'badge-draft',
  archived: 'badge-archived',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [workspaceName, setWorkspaceName] = useState('');
  const [bootstrapping, setBootstrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setIsLoading(true);
    setError(null);

    try {
      const [companyRes, assessmentsRes] = await Promise.all([
        apiFetch('/api/company/me'),
        apiFetch('/api/company/assessments'),
      ]);

      if (companyRes.status === 404) {
        setCompanyInfo(null);
        setAssessments([]);
        setIsLoading(false);
        return;
      }

      if (!companyRes.ok || !assessmentsRes.ok) {
        throw new Error('Failed to load workspace');
      }

      const [companyData, assessmentsData] = await Promise.all([
        companyRes.json(),
        assessmentsRes.json(),
      ]);

      setCompanyInfo(companyData);
      setAssessments(assessmentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const filtered = useMemo(
    () =>
      assessments.filter((assessment) =>
        `${assessment.title} ${assessment.summary}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [assessments, search],
  );

  const stats = useMemo(() => {
    return {
      published: assessments.filter((assessment) => assessment.status === 'published').length,
      activeCandidates: assessments.reduce(
        (sum, assessment) => sum + assessment.inProgressCount,
        0,
      ),
      completions: assessments.reduce((sum, assessment) => sum + assessment.completedCount, 0),
    };
  }, [assessments]);

  async function handleBootstrap() {
    if (!workspaceName.trim()) return;

    setBootstrapping(true);
    setError(null);

    try {
      const res = await apiFetch('/api/company/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workspaceName.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to create workspace');
      }

      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setBootstrapping(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-white/40 uppercase tracking-[0.2em]">Loading workspace</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlassNav variant="company" />
      <div className="editorial-grid min-h-screen px-6 pb-12 pt-24">
        {!companyInfo ? (
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.3fr_0.8fr]">
            <section className="editorial-panel relative overflow-hidden rounded-[2rem] p-8 md:p-12">
              <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-primary/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              <p className="mb-4 text-xs uppercase tracking-[0.45em] text-primary/80">
                Company Workspace
              </p>
              <h1 className="max-w-2xl text-4xl leading-tight md:text-6xl">
                Turn this account into a hiring control room.
              </h1>
              <p className="mt-6 max-w-xl text-base text-white/62">
                Create a company workspace, publish assessment briefs, and assign them to candidates
                by email. Candidate sign-in will claim the assignment automatically.
              </p>
              <div className="mt-10 max-w-xl space-y-4">
                <Input
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder="Acme Hiring Lab"
                  className="h-14 rounded-2xl border-white/10 bg-white/5 text-base focus:border-primary/40 focus:ring-primary/20"
                />
                <LiquidButton
                  onClick={handleBootstrap}
                  disabled={bootstrapping || !workspaceName.trim()}
                  className="h-14 rounded-2xl px-8"
                >
                  {bootstrapping ? 'Creating workspace...' : 'Create workspace'}
                </LiquidButton>
              </div>
              {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
            </section>

            <aside className="editorial-panel rounded-[2rem] p-8">
              <div className="flex items-center gap-3 text-primary">
                <Sparkles className="h-5 w-5" />
                <span className="text-xs uppercase tracking-[0.35em]">V1 Scope</span>
              </div>
              <div className="mt-8 space-y-5 text-sm text-white/68">
                <p>Assessments are now generated from a single recruiter prompt.</p>
                <p>Saving an assessment generates a starter repo and test files for the VS Code workspace.</p>
                <p>Candidates claim assignments through email-match on sign-in instead of email delivery.</p>
              </div>
            </aside>
          </div>
        ) : (
          <div className="mx-auto max-w-7xl">
            {/* Header row */}
            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="editorial-panel rounded-[1.35rem] p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-[11px] uppercase tracking-[0.35em] text-primary/80">
                        {companyInfo.company.name}
                      </p>
                      <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-white/55">
                        {companyInfo.membership.role}
                      </span>
                    </div>
                    <h1 className="mt-3 text-2xl leading-tight md:text-3xl">
                      Assessment operations
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-white/58">
                      Create, publish, assign, and review generated coding assessments.
                    </p>
                  </div>

                  <LiquidButton
                    onClick={() => navigate('/dashboard/create')}
                    className="h-11 gap-3 rounded-xl px-4 normal-case tracking-[0.1em]"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-black/18 ring-1 ring-white/12">
                      <Plus className="h-4 w-4" />
                    </span>
                    <span className="text-[12px] font-semibold uppercase">
                      New assessment
                    </span>
                  </LiquidButton>
                </div>
              </div>

              <div className="editorial-panel rounded-[1.35rem] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">Access</p>
                  <button
                    onClick={signOut}
                    className="text-sm text-white/55 transition-colors hover:text-white"
                  >
                    Sign out
                  </button>
                </div>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">Role</p>
                    <p className="mt-2 text-xl capitalize">{companyInfo.membership.role}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">Created</p>
                    <p className="mt-2 text-base">
                      {new Date(companyInfo.company.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Stats row */}
            <section className="mt-4 grid gap-4 md:grid-cols-3">
              {[
                {
                  label: 'Published',
                  value: stats.published,
                  icon: Zap,
                  accent: 'text-primary',
                  bg: 'bg-primary/10',
                },
                {
                  label: 'In progress',
                  value: stats.activeCandidates,
                  icon: Users,
                  accent: 'text-amber-400',
                  bg: 'bg-amber-400/10',
                },
                {
                  label: 'Completed',
                  value: stats.completions,
                  icon: CheckCircle2,
                  accent: 'text-emerald-400',
                  bg: 'bg-emerald-400/10',
                },
              ].map(({ label, value, icon: Icon, accent, bg }) => (
                <Tilt3D key={label} intensity={7} lift={6}>
                  <div className="editorial-panel stat-card rounded-[1.15rem] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">{label}</p>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                        <Icon className={`h-4 w-4 ${accent}`} />
                      </div>
                    </div>
                    <p className={`stat-number mt-3 text-4xl font-display ${accent}`}>{value}</p>
                  </div>
                </Tilt3D>
              ))}
            </section>

            {/* Search */}
            <section className="mt-4 editorial-panel rounded-[1.15rem] p-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by title or summary"
                  className="h-11 rounded-lg border-white/10 bg-white/5 pl-11 focus:border-primary/30"
                />
              </div>
            </section>

            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

            {/* Assessment cards */}
            <section className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map((assessment, index) => (
                <Tilt3D key={assessment.id} intensity={6} lift={5}>
                <article
                  className="assessment-card-accent editorial-panel group rounded-[1.15rem] p-5"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`rounded-md px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${STATUS_STYLES[assessment.status]}`}
                    >
                      {assessment.status}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-white/45">
                      <Clock className="h-3.5 w-3.5" />
                      {assessment.durationMinutes} min
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl leading-tight">{assessment.title}</h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/60">
                    {assessment.summary || assessment.instructionsMd}
                  </p>

                  <div className="mt-5 grid grid-cols-3 gap-2.5 text-center text-sm">
                    {[
                      { label: 'Sent', value: assessment.assignmentCount },
                      { label: 'Live', value: assessment.inProgressCount },
                      { label: 'Done', value: assessment.completedCount },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="rounded-[0.95rem] border border-white/8 bg-white/[0.04] p-3"
                      >
                        <div className="text-xl font-display">{value}</div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/40">
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/38">
                    {assessment.workspaceFileCount} workspace files generated
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4">
                    <span className="text-xs text-white/42">
                      {new Date(assessment.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigate(`/dashboard/assessments/${assessment.id}/results`)}
                        className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
                      >
                        <BarChart3 className="h-4 w-4" />
                        Results
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/send/${assessment.id}`)}
                        className="inline-flex items-center gap-2 text-sm text-primary transition-colors hover:text-white"
                      >
                        Manage
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </div>
                </article>
                </Tilt3D>
              ))}
            </section>

            {filtered.length === 0 && (
              <section className="mt-6 editorial-panel rounded-[1.15rem] p-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  <Building2 className="h-7 w-7 text-white/30" />
                </div>
                <h2 className="mt-5 text-2xl">No assessments match this view.</h2>
                <p className="mx-auto mt-3 max-w-md text-sm text-white/58">
                  Create a new assessment or clear the current search to see the full slate.
                </p>
                <div className="mt-8">
                  <LiquidButton onClick={() => navigate('/dashboard/create')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create first assessment
                  </LiquidButton>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
