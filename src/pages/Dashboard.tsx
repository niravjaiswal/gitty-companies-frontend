import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassNav from '@/components/GlassNav';
import LiquidButton from '@/components/LiquidButton';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, BarChart3, Building2, Plus, Search, Sparkles } from 'lucide-react';

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
}

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
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
                  className="h-14 rounded-2xl border-white/10 bg-white/5 text-base"
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
                <p>Manual authoring is live in this implementation.</p>
                <p>GitHub import, PRD ingestion, and AI generation remain future work.</p>
                <p>Candidates claim assignments through email-match on sign-in instead of email delivery.</p>
              </div>
            </aside>
          </div>
        ) : (
          <div className="mx-auto max-w-7xl">
            <section className="grid gap-6 lg:grid-cols-[1.35fr_0.75fr]">
              <div className="editorial-panel rounded-[2rem] p-8 md:p-10">
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.45em] text-primary/80">
                      {companyInfo.company.name}
                    </p>
                    <h1 className="mt-4 max-w-2xl text-4xl leading-tight md:text-6xl">
                      Assessments with real ownership, real assignment state, and no mock data.
                    </h1>
                  </div>
                  <LiquidButton
                    onClick={() => navigate('/dashboard/create')}
                    className="h-12 rounded-full px-6"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New assessment
                  </LiquidButton>
                </div>
              </div>

              <div className="editorial-panel rounded-[2rem] p-8">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/45">Access</p>
                  <button
                    onClick={signOut}
                    className="text-sm text-white/55 transition-colors hover:text-white"
                  >
                    Sign out
                  </button>
                </div>
                <div className="mt-6 space-y-4">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/45">Role</p>
                    <p className="mt-2 text-2xl capitalize">{companyInfo.membership.role}</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/45">Created</p>
                    <p className="mt-2 text-lg">
                      {new Date(companyInfo.company.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                ['Published', stats.published],
                ['In progress', stats.activeCandidates],
                ['Completed', stats.completions],
              ].map(([label, value]) => (
                <div key={label} className="editorial-panel rounded-[1.75rem] p-6">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/45">{label}</p>
                  <p className="mt-4 text-4xl">{value}</p>
                </div>
              ))}
            </section>

            <section className="mt-6 editorial-panel rounded-[2rem] p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by title or summary"
                  className="h-12 rounded-full border-white/10 bg-white/5 pl-11"
                />
              </div>
            </section>

            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

            <section className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map((assessment, index) => (
                <article
                  key={assessment.id}
                  className="editorial-panel group rounded-[2rem] p-6 transition-transform duration-500 hover:-translate-y-1"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/55">
                      {assessment.status}
                    </span>
                    <span className="text-sm text-white/45">{assessment.durationMinutes} min</span>
                  </div>
                  <h2 className="mt-6 text-3xl leading-tight">{assessment.title}</h2>
                  <p className="mt-4 text-sm leading-6 text-white/60">
                    {assessment.summary || assessment.instructionsMd}
                  </p>

                  <div className="mt-8 grid grid-cols-3 gap-3 text-center text-sm">
                    <div className="rounded-[1.25rem] border border-white/8 bg-white/4 p-3">
                      <div className="text-xl">{assessment.assignmentCount}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-white/40">
                        Sent
                      </div>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/8 bg-white/4 p-3">
                      <div className="text-xl">{assessment.inProgressCount}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-white/40">
                        Live
                      </div>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/8 bg-white/4 p-3">
                      <div className="text-xl">{assessment.completedCount}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-white/40">
                        Done
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between border-t border-white/8 pt-5">
                    <span className="text-sm text-white/42">
                      {new Date(assessment.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-4">
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
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            {filtered.length === 0 && (
              <section className="mt-8 editorial-panel rounded-[2rem] p-10 text-center">
                <Building2 className="mx-auto h-8 w-8 text-white/35" />
                <h2 className="mt-5 text-3xl">No assessments match this view.</h2>
                <p className="mx-auto mt-3 max-w-md text-sm text-white/58">
                  Create a new assessment or clear the current search to see the full slate.
                </p>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
