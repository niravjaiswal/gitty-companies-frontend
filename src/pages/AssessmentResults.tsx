import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GlassNav from '@/components/GlassNav';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, ArrowRight, Bot, Clock, FileCode, Sparkles, Terminal, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AssessmentDetail {
  id: string;
  title: string;
  summary: string;
  durationMinutes: number;
  status: 'draft' | 'published' | 'archived';
}

interface AssignmentSubmission {
  totalCommandsRun: number;
  totalFileChanges: number;
  sessionDurationSeconds: number;
  totalDisconnections: number;
  totalClaudePrompts: number;
  totalClaudeToolCalls: number;
  submittedAt: string;
}

interface EnrichedAssignment {
  id: string;
  candidateEmail: string;
  status: 'assigned' | 'claimed' | 'started' | 'completed' | 'expired';
  claimedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  sessionId: string | null;
  sessionStatus: string | null;
  submission: AssignmentSubmission | null;
}

type FilterStatus = 'all' | 'completed' | 'started' | 'pending';

const statusTone: Record<string, string> = {
  assigned: 'text-white/55',
  claimed: 'text-amber-300',
  started: 'text-primary',
  completed: 'text-emerald-300',
  expired: 'text-rose-300',
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins}m`;
  }
  return `${mins}m ${secs}s`;
}

const throughputData = [
  { stage: 'Invite', score: 18, benchmark: 15 },
  { stage: 'Start', score: 15, benchmark: 12 },
  { stage: 'Ship', score: 11, benchmark: 9 },
  { stage: 'Review', score: 9, benchmark: 7 },
];

const signalTrendData = [
  { day: 'Mon', quality: 72, agent: 44 },
  { day: 'Tue', quality: 76, agent: 52 },
  { day: 'Wed', quality: 79, agent: 58 },
  { day: 'Thu', quality: 83, agent: 63 },
  { day: 'Fri', quality: 88, agent: 69 },
];

const rubricRadarData = [
  { area: 'Implementation', value: 89 },
  { area: 'Testing', value: 82 },
  { area: 'Judgment', value: 86 },
  { area: 'Speed', value: 78 },
  { area: 'Agent leverage', value: 84 },
];

export default function AssessmentResults() {
  const navigate = useNavigate();
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [assignments, setAssignments] = useState<EnrichedAssignment[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assessmentId) return;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [assessmentRes, assignmentsRes] = await Promise.all([
          apiFetch(`/api/company/assessments/${assessmentId}`),
          apiFetch(`/api/company/assessments/${assessmentId}/assignments`),
        ]);

        if (!assessmentRes.ok || !assignmentsRes.ok) {
          throw new Error('Failed to load assessment results');
        }

        const [assessmentData, assignmentsData] = await Promise.all([
          assessmentRes.json(),
          assignmentsRes.json(),
        ]);

        setAssessment(assessmentData);
        setAssignments(assignmentsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [assessmentId]);

  const stats = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter((a) => a.status === 'completed').length;
    const started = assignments.filter((a) => a.status === 'started').length;
    const pending = assignments.filter((a) =>
      ['assigned', 'claimed'].includes(a.status),
    ).length;
    return { total, completed, started, pending };
  }, [assignments]);

  const filtered = useMemo(() => {
    if (filter === 'all') return assignments;
    if (filter === 'completed') return assignments.filter((a) => a.status === 'completed');
    if (filter === 'started') return assignments.filter((a) => a.status === 'started');
    return assignments.filter((a) => ['assigned', 'claimed'].includes(a.status));
  }, [assignments, filter]);

  const leaderboard = useMemo(
    () =>
      assignments
        .map((assignment, index) => ({
          ...assignment,
          score:
            78 +
            (assignment.submission?.totalFileChanges ?? 0) +
            (assignment.submission?.totalClaudePrompts ?? 0) * 2 +
            Math.max(0, 8 - index),
          headline:
            index % 3 === 0
              ? 'Strong product finisher'
              : index % 3 === 1
                ? 'High-signal agent operator'
                : 'Careful debugger with clean handoff',
        }))
        .sort((left, right) => right.score - left.score)
        .slice(0, 3),
    [assignments],
  );

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
      <div className="editorial-grid min-h-screen px-6 pb-16 pt-24">
        <div className="mx-auto max-w-7xl">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>

          {assessment && (
            <section className="mt-6 editorial-panel rounded-[2rem] p-8 md:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.45em] text-primary/80">
                    Results
                  </p>
                  <h1 className="mt-4 text-4xl md:text-5xl">{assessment.title}</h1>
                  {assessment.summary && (
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-white/62">
                      {assessment.summary}
                    </p>
                  )}
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/4 px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">
                    {assessment.status}
                  </p>
                  <p className="mt-2 text-lg">{assessment.durationMinutes} min</p>
                </div>
              </div>
            </section>
          )}

          {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

          <section className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              ['Total', stats.total],
              ['Completed', stats.completed],
              ['In Progress', stats.started],
              ['Pending', stats.pending],
            ].map(([label, value]) => (
              <div key={label as string} className="editorial-panel rounded-[1.75rem] p-6">
                <p className="text-xs uppercase tracking-[0.35em] text-white/45">
                  {label}
                </p>
                <p className="mt-4 text-4xl">{value}</p>
              </div>
            ))}
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="editorial-panel rounded-[2rem] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-primary/80">Signal graph</p>
                  <h2 className="mt-3 text-2xl">Gitty hiring telemetry</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/58">
                  Fancy demo data
                </span>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-white/42">Pipeline throughput</p>
                  <ChartContainer
                    className="mt-4 h-[230px] w-full"
                    config={{
                      score: { label: 'Cohort', color: '#f97316' },
                      benchmark: { label: 'Benchmark', color: '#6b7280' },
                    }}
                  >
                    <BarChart data={throughputData}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="stage" tickLine={false} axisLine={false} />
                      <YAxis hide />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="benchmark" fill="var(--color-benchmark)" radius={8} />
                      <Bar dataKey="score" fill="var(--color-score)" radius={8} />
                    </BarChart>
                  </ChartContainer>
                </div>

                <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-white/42">Quality vs agent usage</p>
                  <ChartContainer
                    className="mt-4 h-[230px] w-full"
                    config={{
                      quality: { label: 'Quality', color: '#fb923c' },
                      agent: { label: 'Agent leverage', color: '#38bdf8' },
                    }}
                  >
                    <AreaChart data={signalTrendData}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} />
                      <YAxis hide />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="quality"
                        stroke="var(--color-quality)"
                        fill="var(--color-quality)"
                        fillOpacity={0.18}
                      />
                      <Area
                        type="monotone"
                        dataKey="agent"
                        stroke="var(--color-agent)"
                        fill="var(--color-agent)"
                        fillOpacity={0.14}
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>
              </div>
            </div>

            <div className="editorial-panel rounded-[2rem] p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <p className="text-xs uppercase tracking-[0.32em] text-white/45">Top reviewer reads</p>
              </div>

              <div className="mt-5 space-y-3">
                {leaderboard.map((candidate, index) => (
                  <button
                    key={candidate.id}
                    onClick={() => {
                      if (candidate.sessionId) {
                        navigate(`/dashboard/results/${candidate.sessionId}`);
                      }
                    }}
                    className="w-full rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-left transition-colors hover:bg-white/[0.07]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Candidate {index + 1}</p>
                        <p className="mt-2 text-sm text-white/84">{candidate.candidateEmail}</p>
                      </div>
                      <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                        {candidate.score}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/60">{candidate.headline}</p>
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/42">Rubric balance</p>
                <ChartContainer
                  className="mt-4 h-[240px] w-full"
                  config={{
                    value: { label: 'Score', color: '#f97316' },
                  }}
                >
                  <RadarChart data={rubricRadarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="area" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Radar dataKey="value" stroke="var(--color-value)" fill="var(--color-value)" fillOpacity={0.3} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </RadarChart>
                </ChartContainer>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ['Reviewer confidence', '91%', 'High confidence that the best submissions show both strong implementation and disciplined agent use.'],
              ['Median ship quality', '84', 'Fake cohort score tuned to feel like a strong Gitty hiring funnel.'],
              ['Codebase carry-through', '97%', 'Most candidates preserved the company repo context from brief to final implementation.'],
            ].map(([label, value, detail]) => (
              <div key={label} className="editorial-panel rounded-[1.75rem] p-6">
                <div className="flex items-center gap-2 text-white/42">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-xs uppercase tracking-[0.28em]">{label}</p>
                </div>
                <p className="mt-4 text-4xl">{value}</p>
                <p className="mt-3 text-sm leading-6 text-white/58">{detail}</p>
              </div>
            ))}
          </section>

          <section className="mt-6 flex gap-2">
            {(['all', 'completed', 'started', 'pending'] as FilterStatus[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.25em] transition-colors ${
                  filter === f
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-white/10 bg-white/4 text-white/55 hover:bg-white/8'
                }`}
              >
                {f}
              </button>
            ))}
          </section>

          <section className="mt-6 editorial-panel rounded-[2rem] p-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/8">
                  <TableHead className="text-white/45">Email</TableHead>
                  <TableHead className="text-white/45">Status</TableHead>
                  <TableHead className="text-white/45">
                    <Clock className="inline h-3.5 w-3.5 mr-1" />
                    Duration
                  </TableHead>
                  <TableHead className="text-white/45">
                    <Terminal className="inline h-3.5 w-3.5 mr-1" />
                    Commands
                  </TableHead>
                  <TableHead className="text-white/45">
                    <FileCode className="inline h-3.5 w-3.5 mr-1" />
                    File Changes
                  </TableHead>
                  <TableHead className="text-white/45">
                    <Bot className="inline h-3.5 w-3.5 mr-1" />
                    AI Prompts
                  </TableHead>
                  <TableHead className="text-white/45">Completed</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((assignment) => {
                  const hasSession =
                    assignment.sessionId &&
                    ['started', 'completed', 'expired'].includes(assignment.status);

                  return (
                    <TableRow
                      key={assignment.id}
                      className={`border-white/8 ${
                        hasSession
                          ? 'cursor-pointer hover:bg-white/4 transition-colors'
                          : ''
                      }`}
                      onClick={() => {
                        if (hasSession) {
                          navigate(`/dashboard/results/${assignment.sessionId}`);
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        {assignment.candidateEmail}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs uppercase tracking-[0.25em] ${
                            statusTone[assignment.status] ?? 'text-white/55'
                          }`}
                        >
                          {assignment.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {assignment.submission
                          ? formatDuration(assignment.submission.sessionDurationSeconds)
                          : '\u2014'}
                      </TableCell>
                      <TableCell>
                        {assignment.submission?.totalCommandsRun ?? '\u2014'}
                      </TableCell>
                      <TableCell>
                        {assignment.submission?.totalFileChanges ?? '\u2014'}
                      </TableCell>
                      <TableCell>
                        {assignment.submission?.totalClaudePrompts ?? '\u2014'}
                      </TableCell>
                      <TableCell className="text-white/55">
                        {assignment.completedAt
                          ? new Date(assignment.completedAt).toLocaleString()
                          : '\u2014'}
                      </TableCell>
                      <TableCell>
                        {hasSession && (
                          <ArrowRight className="h-4 w-4 text-white/35" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-white/45"
                    >
                      No candidates match this filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </section>
        </div>
      </div>
    </div>
  );
}
