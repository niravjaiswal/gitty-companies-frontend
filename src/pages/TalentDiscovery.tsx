import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassNav from '@/components/GlassNav';
import LiquidButton from '@/components/LiquidButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Github,
  Loader2,
  Search,
  SendHorizonal,
  Star,
  Users,
  X,
} from 'lucide-react';

interface GitHubCandidate {
  login: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  avatarUrl: string;
  htmlUrl: string;
  publicRepos: number;
  followers: number;
  location: string | null;
  company: string | null;
  topLanguages: string[];
}

interface AssessmentOption {
  id: string;
  title: string;
  status: string;
}

type Phase = 'search' | 'results' | 'invite' | 'done';

export default function TalentDiscovery() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('search');
  const [description, setDescription] = useState('');
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState<GitHubCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{ created: number; skipped: string[] } | null>(null);

  useEffect(() => {
    apiFetch('/api/company/assessments')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: AssessmentOption[]) => {
        const published = data.filter((a) => a.status === 'published');
        setAssessments(published);
        if (published.length > 0) setSelectedAssessmentId(published[0].id);
      })
      .catch(() => {});
  }, []);

  async function handleSearch() {
    if (!description.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await apiFetch('/api/talent/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'Search failed');
      }
      const data = await res.json() as { query: string; candidates: GitHubCandidate[] };
      setSearchQuery(data.query);
      setCandidates(data.candidates);
      const initialEmails: Record<string, string> = {};
      for (const c of data.candidates) {
        initialEmails[c.login] = c.email ?? '';
      }
      setEmailMap(initialEmails);
      setPhase('results');
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  function toggleSelect(login: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(login)) next.delete(login);
      else next.add(login);
      return next;
    });
  }

  async function handleInvite() {
    if (!selectedAssessmentId || selected.size === 0) return;
    const candidates_to_invite = Array.from(selected)
      .map((login) => ({ email: emailMap[login] ?? '', githubLogin: login }))
      .filter((c) => c.email.includes('@'));

    if (candidates_to_invite.length === 0) {
      setInviteError('No valid email addresses. Add emails for the selected candidates.');
      return;
    }

    setInviting(true);
    setInviteError(null);
    try {
      const res = await apiFetch('/api/talent/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId: selectedAssessmentId, candidates: candidates_to_invite }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'Invite failed');
      }
      const result = await res.json() as { created: number; skipped: string[] };
      setInviteResult(result);
      setPhase('done');
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlassNav variant="company" />
      <div className="editorial-grid min-h-screen px-6 pb-16 pt-24">
        <div className="mx-auto w-full max-w-5xl">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>

          <div className="mt-6">
            <div className="flex items-center gap-3">
              <p className="text-[11px] uppercase tracking-[0.38em] text-primary/80">Talent Discovery</p>
            </div>
            <h1 className="mt-3 text-3xl leading-tight md:text-4xl">Find engineers on GitHub</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
              Describe the engineer you're looking for. We'll search GitHub to surface relevant profiles, then let you send your assessment directly.
            </p>
          </div>

          {/* ── Phase: Search ───────────────────────────────────────── */}
          {phase === 'search' && (
            <section className="mt-8 editorial-panel rounded-[1.75rem] p-6 md:p-7">
              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div>
                  <label className="text-[11px] uppercase tracking-[0.32em] text-white/45">
                    Describe the engineer
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Senior TypeScript engineer with React experience and a background in fintech, 3+ years of OSS contributions"
                    className="mt-3 min-h-[120px] rounded-[1.3rem] border-white/10 bg-white/5 text-sm"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-[0.32em] text-white/45">
                    Assessment to send
                  </label>
                  {assessments.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {assessments.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setSelectedAssessmentId(a.id)}
                          className={`w-full rounded-[1.15rem] border px-4 py-3 text-left text-sm transition-colors ${
                            selectedAssessmentId === a.id
                              ? 'border-primary/50 bg-primary/10 text-white'
                              : 'border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.07]'
                          }`}
                        >
                          {a.title}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-white/40">
                      No published assessments yet.{' '}
                      <button
                        onClick={() => navigate('/dashboard/create')}
                        className="text-primary hover:underline"
                      >
                        Create one first.
                      </button>
                    </p>
                  )}
                </div>
              </div>

              {searchError && (
                <p className="mt-4 text-sm text-red-400">{searchError}</p>
              )}

              <div className="mt-6 flex justify-end">
                <LiquidButton
                  onClick={handleSearch}
                  disabled={searching || !description.trim() || !selectedAssessmentId}
                  className="h-11 rounded-full px-6"
                >
                  {searching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching GitHub…
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search GitHub
                    </>
                  )}
                </LiquidButton>
              </div>
            </section>
          )}

          {/* ── Phase: Results ──────────────────────────────────────── */}
          {phase === 'results' && (
            <>
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-white/55">
                    GitHub query: <code className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/80">{searchQuery}</code>
                  </p>
                  <p className="mt-1 text-sm text-white/40">
                    {candidates.length} profiles found — select candidates to invite
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setPhase('search'); setCandidates([]); setSelected(new Set()); }}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-sm text-white/60 hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    New search
                  </button>
                  <LiquidButton
                    onClick={() => setPhase('invite')}
                    disabled={selected.size === 0}
                    className="h-10 rounded-full px-5"
                  >
                    Invite {selected.size > 0 ? `${selected.size} selected` : 'selected'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </LiquidButton>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.login}
                    onClick={() => toggleSelect(candidate.login)}
                    className={`cursor-pointer rounded-[1.5rem] border p-4 transition-all ${
                      selected.has(candidate.login)
                        ? 'border-primary/60 bg-primary/8 ring-1 ring-primary/30'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={candidate.avatarUrl}
                        alt={candidate.login}
                        className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {candidate.name ?? candidate.login}
                        </p>
                        <p className="text-[11px] text-white/45">@{candidate.login}</p>
                      </div>
                      <a
                        href={candidate.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 text-white/30 hover:text-white/70"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>

                    {candidate.bio && (
                      <p className="mt-3 text-[12px] leading-5 text-white/55 line-clamp-2">{candidate.bio}</p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {candidate.topLanguages.map((lang) => (
                        <span
                          key={lang}
                          className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[10px] text-white/65"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-[11px] text-white/38">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {candidate.followers.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Github className="h-3 w-3" />
                        {candidate.publicRepos} repos
                      </span>
                      {candidate.location && (
                        <span className="truncate">{candidate.location}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Phase: Invite ───────────────────────────────────────── */}
          {phase === 'invite' && (
            <section className="mt-8 editorial-panel rounded-[1.75rem] p-6 md:p-7">
              <div className="flex items-center gap-3 text-primary">
                <SendHorizonal className="h-4 w-4" />
                <p className="text-xs uppercase tracking-[0.32em]">Send assessments</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/62">
                Add or confirm an email address for each candidate. Only candidates with a valid email will receive an assignment.
              </p>

              <div className="mt-5 space-y-3">
                {Array.from(selected).map((login) => {
                  const candidate = candidates.find((c) => c.login === login);
                  if (!candidate) return null;
                  return (
                    <div
                      key={login}
                      className="flex items-center gap-4 rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 py-3"
                    >
                      <img
                        src={candidate.avatarUrl}
                        alt={login}
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                      />
                      <div className="min-w-0 w-36 shrink-0">
                        <p className="truncate text-sm text-white">{candidate.name ?? login}</p>
                        <p className="text-[11px] text-white/40">@{login}</p>
                      </div>
                      <Input
                        value={emailMap[login] ?? ''}
                        onChange={(e) => setEmailMap((prev) => ({ ...prev, [login]: e.target.value }))}
                        placeholder="candidate@email.com"
                        className="flex-1 h-9 rounded-full border-white/10 bg-white/5 text-sm"
                      />
                      <button
                        onClick={() => setSelected((prev) => { const n = new Set(prev); n.delete(login); return n; })}
                        className="shrink-0 text-white/30 hover:text-white/70"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-[1.15rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">Assessment</p>
                <p className="mt-1 text-sm text-white/80">
                  {assessments.find((a) => a.id === selectedAssessmentId)?.title ?? selectedAssessmentId}
                </p>
              </div>

              {inviteError && <p className="mt-4 text-sm text-red-400">{inviteError}</p>}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setPhase('results')}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 px-5 text-sm text-white/60 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <LiquidButton
                  onClick={handleInvite}
                  disabled={inviting || selected.size === 0}
                  className="h-11 rounded-full px-6"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating assignments…
                    </>
                  ) : (
                    <>
                      <SendHorizonal className="mr-2 h-4 w-4" />
                      Create {selected.size} assignment{selected.size !== 1 ? 's' : ''}
                    </>
                  )}
                </LiquidButton>
              </div>
            </section>
          )}

          {/* ── Phase: Done ─────────────────────────────────────────── */}
          {phase === 'done' && inviteResult && (
            <section className="mt-8 editorial-panel rounded-[1.75rem] p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mt-5 text-2xl">Assignments created</h2>
              <p className="mt-3 text-sm text-white/55">
                <span className="text-white">{inviteResult.created}</span> assignment{inviteResult.created !== 1 ? 's' : ''} created.
                {inviteResult.skipped.length > 0 && (
                  <> {inviteResult.skipped.length} duplicate{inviteResult.skipped.length !== 1 ? 's' : ''} skipped.</>
                )}
              </p>
              <p className="mt-2 text-xs text-white/40">
                Candidates will see the assessment when they sign in with their email address.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => { setPhase('search'); setDescription(''); setCandidates([]); setSelected(new Set()); setInviteResult(null); }}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 px-5 text-sm text-white/60 hover:text-white"
                >
                  New search
                </button>
                <LiquidButton
                  onClick={() => navigate(`/dashboard/send/${selectedAssessmentId}`)}
                  className="h-11 rounded-full px-6"
                >
                  View assignments
                </LiquidButton>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
