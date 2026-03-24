import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GlassNav from '@/components/GlassNav';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, ArrowRight, Clock, FileCode, Terminal, Bot } from 'lucide-react';
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
