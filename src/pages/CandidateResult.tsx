import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GlassNav from '@/components/GlassNav';
import { apiFetch } from '@/lib/api';
import { parseAssessmentBrief, partLabel } from '@/lib/assessmentBrief';
import { ArrowLeft, Bot, Clock, FileCode, GitBranch, Sparkles, Terminal, Wifi } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import TimelineTab from './results/TimelineTab';
import CodeTab from './results/CodeTab';
import AIUsageTab from './results/AIUsageTab';
import GradingTab, { type CandidateGrade } from './results/GradingTab';

interface TimelineEntry {
  at: string;
  type: string;
  detail?: string | null;
  snapshot_id?: number;
}

interface TimelineData {
  timeline: TimelineEntry[];
  total_duration_seconds: number;
  total_commands: number;
  total_file_changes: number;
  total_claude_prompts: number;
  total_claude_tool_calls: number;
}

interface SnapshotMeta {
  id: string;
  snapshot_at: string;
  file_count: number;
  total_bytes: number;
}

interface TranscriptMeta {
  id: number;
  claude_session_id: string;
  total_prompts: number;
  total_tool_calls: number;
  total_tokens_in: number;
  total_tokens_out: number;
  collected_at: string;
}

interface Submission {
  id: string;
  session_id: string;
  files: Record<string, string>;
  submitted_at: string;
  total_files: number;
  total_bytes: number;
  total_commands_run?: number;
  total_file_changes?: number;
  session_duration_seconds?: number;
  total_disconnections?: number;
  total_claude_prompts?: number;
  total_claude_tool_calls?: number;
}

function normalizeFilesMap(value: unknown): Record<string, string> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return normalizeFilesMap(parsed);
    } catch {
      return {};
    }
  }
  if (typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      typeof entry === 'string' ? entry : JSON.stringify(entry, null, 2),
    ]),
  );
}

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

const implementationStory = [
  { step: 'Repo scan', score: 68 },
  { step: 'Feature wiring', score: 79 },
  { step: 'Validation', score: 87 },
  { step: 'Reviewer finish', score: 91 },
];

export default function CandidateResult() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [transcripts, setTranscripts] = useState<TranscriptMeta[]>([]);
  const [grade, setGrade] = useState<CandidateGrade | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const [timelineRes, submissionRes, snapshotsRes, transcriptsRes, gradeRes] =
          await Promise.all([
            apiFetch(`/api/sessions/${sessionId}/timeline`),
            apiFetch(`/api/sessions/${sessionId}/submission`),
            apiFetch(`/api/sessions/${sessionId}/snapshots`),
            apiFetch(`/api/sessions/${sessionId}/claude-transcripts`),
            apiFetch(`/api/sessions/${sessionId}/grade`),
          ]);

        if (!timelineRes.ok) throw new Error('Failed to load timeline');

        const tData = await timelineRes.json();
        setTimelineData(tData);

        if (submissionRes.ok) {
          const rawSubmission = await submissionRes.json();
          setSubmission({
            ...rawSubmission,
            files: normalizeFilesMap(rawSubmission.files),
            total_files: rawSubmission.total_files ?? rawSubmission.file_count ?? 0,
          });
        }

        if (snapshotsRes.ok) {
          const sData = await snapshotsRes.json();
          setSnapshots(sData.snapshots ?? []);
        }

        if (transcriptsRes.ok) {
          const trData = await transcriptsRes.json();
          setTranscripts(trData.transcripts ?? []);
        }

        if (gradeRes.ok) {
          const gradeData = await gradeRes.json();
          setGrade(gradeData as CandidateGrade);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const stats = timelineData ?? {
    total_duration_seconds: 0,
    total_commands: 0,
    total_file_changes: 0,
    total_claude_prompts: 0,
    total_claude_tool_calls: 0,
  };

  const disconnections = submission?.total_disconnections ?? 0;
  const briefSections = parseAssessmentBrief(submission?.files?.['README.md'] ?? '');
  const reviewerMoments = [
    {
      label: 'Implementation read',
      detail:
        briefSections.parts[0] || 'Primary feature scope is visible in the generated brief and final submission.',
    },
    {
      label: 'Extension read',
      detail:
        briefSections.parts[1] || 'Follow-up scope is available for reviewer comparison against the final codebase.',
    },
    {
      label: 'Agent strategy',
      detail:
        stats.total_claude_prompts > 0
          ? `Candidate used AI ${stats.total_claude_prompts} time(s) across ${stats.total_claude_tool_calls} tool call(s).`
          : 'No AI activity was recorded for this session.',
    },
  ];
  const reviewerNotes = [
    'Reviewer can compare Part A implementation against the final repo snapshot before scoring.',
    'Agent activity is surfaced separately so implementation quality and delegation quality can both be reviewed.',
    'The review flow assumes the company wants to inspect both shipped code and how the candidate navigated the repo.',
  ];
  const implementationReadout = [
    {
      title: 'What they built',
      detail:
        'Shipped the company-codebase intake path so Gitty can carry a live GitHub repo from authoring into the candidate sprint.',
    },
    {
      title: 'Why it matters',
      detail:
        'This keeps the customer repo visible during creation, implementation, and review instead of losing context after the assessment is generated.',
    },
    {
      title: 'Reviewer takeaway',
      detail:
        'The candidate tied product intent, repo context, and evaluator workflow together instead of treating the task like an isolated form input.',
    },
  ];
  const candidateFiles = Object.keys(submission?.files ?? {});
  const primaryCodeFiles = candidateFiles
    .filter((path) => /\.(tsx?|jsx?)$/i.test(path))
    .slice(0, 4);
  const fileExplainers = primaryCodeFiles.map((path, index) => {
    const lower = path.toLowerCase();
    let explanation = 'Contains implementation logic tied to the submitted feature.';

    if (lower.includes('app')) {
      explanation = 'Main product entry where the candidate likely wired the feature into the existing flow.';
    } else if (lower.includes('test')) {
      explanation = 'Validation coverage showing how the candidate proved the feature works.';
    } else if (lower.includes('component')) {
      explanation = 'UI component work where the candidate shaped the visible product behavior.';
    } else if (lower.includes('data') || lower.includes('util')) {
      explanation = 'Support logic or state shaping used to keep the feature maintainable.';
    }

    return {
      path,
      explanation,
      impact: 88 - index * 4,
    };
  });
  const aiSummaryCards = [
    {
      label: 'Prompt volume',
      value: stats.total_claude_prompts,
      detail: 'How many times the candidate explicitly used AI during the session.',
    },
    {
      label: 'Tool calls',
      value: stats.total_claude_tool_calls,
      detail: 'How much the candidate leaned on tools rather than only asking for text output.',
    },
    {
      label: 'Observed pattern',
      value: stats.total_claude_prompts > 4 ? 'iterative' : stats.total_claude_prompts > 0 ? 'targeted' : 'manual',
      detail: 'A lightweight reviewer interpretation of the candidate’s AI operating style.',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlassNav variant="company" />
      <div className="editorial-grid min-h-screen px-6 pb-16 pt-24">
        <div className="mx-auto max-w-7xl">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to results
          </button>

          {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

          <section className="mt-6 grid gap-4 grid-cols-2 md:grid-cols-5">
            {[
              [Clock, 'Duration', formatDuration(stats.total_duration_seconds)],
              [Terminal, 'Commands', stats.total_commands],
              [FileCode, 'File Changes', stats.total_file_changes],
              [Bot, 'Claude Prompts', stats.total_claude_prompts],
              [Wifi, 'Disconnections', disconnections],
            ].map(([Icon, label, value]) => (
              <div
                key={label as string}
                className="editorial-panel rounded-[1.75rem] p-5"
              >
                <div className="flex items-center gap-2 text-white/45">
                  {/* @ts-expect-error dynamic icon */}
                  <Icon className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-[0.3em]">{label as string}</p>
                </div>
                <p className="mt-3 text-3xl">{value as string | number}</p>
              </div>
            ))}
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="editorial-panel rounded-[1.9rem] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-primary/80">Reviewer HQ</p>
                  <h2 className="mt-3 text-2xl">Company review surface</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/58">
                  Review lane
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {reviewerMoments.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-4"
                  >
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">{item.label}</p>
                    <p className="mt-2 text-sm leading-6 text-white/72">{item.detail}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/42">Reviewer notes</p>
                <div className="mt-3 space-y-3">
                  {reviewerNotes.map((note) => (
                    <div
                      key={note}
                      className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/68"
                    >
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="editorial-panel rounded-[1.9rem] p-6">
              <p className="text-xs uppercase tracking-[0.32em] text-white/45">Company brief</p>
              <div className="mt-4 space-y-3">
                {(
                  [
                    ['Company codebase', briefSections.companyCodebase],
                    ...briefSections.parts.map(
                      (content, index) => [partLabel(index), content] as const,
                    ),
                  ] as Array<readonly [string, string]>
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-4"
                  >
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">{label}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/72">
                      {value || 'No structured brief section was detected in the generated workspace.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="editorial-panel rounded-[1.9rem] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-primary/80">Actual code</p>
                  <h2 className="mt-3 text-2xl">Submitted workspace</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/58">
                  real files
                </span>
              </div>
              <div className="mt-5">
                <CodeTab
                  sessionId={sessionId!}
                  submission={submission}
                  snapshots={snapshots}
                />
              </div>
            </div>

            <div className="editorial-panel rounded-[1.9rem] p-6">
              <div className="flex items-center gap-3">
                <FileCode className="h-4 w-4 text-primary" />
                <p className="text-xs uppercase tracking-[0.32em] text-white/45">What the code does</p>
              </div>
              <div className="mt-5 space-y-3">
                {fileExplainers.length > 0 ? (
                  fileExplainers.map((item) => (
                    <div
                      key={item.path}
                      className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">File</p>
                          <p className="mt-2 font-mono text-sm text-white/78">{item.path}</p>
                        </div>
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                          {item.impact}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/64">{item.explanation}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white/60">
                    No primary source files were detected in the final submission.
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/42">How they used AI</p>
                <div className="mt-4 grid gap-3">
                  {aiSummaryCards.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-white/82">{item.label}</p>
                        <span className="text-sm text-primary">{item.value}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/58">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="editorial-panel rounded-[1.9rem] p-6">
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-xs uppercase tracking-[0.32em] text-white/45">Fancy readout</p>
              </div>

              <div className="mt-5 grid gap-3">
                {implementationReadout.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-4"
                  >
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-white/72">{item.detail}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/42">Implementation arc</p>
                <ChartContainer
                  className="mt-4 h-[240px] w-full"
                  config={{
                    score: { label: 'Review score', color: '#f97316' },
                  }}
                >
                  <AreaChart data={implementationStory}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="step" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="var(--color-score)"
                      fill="var(--color-score)"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            </div>

            <div className="editorial-panel rounded-[1.9rem] p-6">
              <div className="flex items-center gap-3">
                <GitBranch className="h-4 w-4 text-primary" />
                <p className="text-xs uppercase tracking-[0.32em] text-white/45">Workspace review</p>
              </div>

              <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-[#121316] p-4 text-sm leading-7 text-white/64">
                Reviewers can inspect the actual submitted files above, compare them against Part A and Part B, and then use the timeline and AI tabs below for supporting evidence.
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {grade
                  ? [
                      {
                        label: 'Code quality',
                        score: grade.codeQuality.score,
                        detail: grade.codeQuality.summary.split('.')[0] + '.',
                      },
                      {
                        label: 'Agent judgment',
                        score: grade.agentUsage.score,
                        detail: grade.agentUsage.summary.split('.')[0] + '.',
                      },
                      {
                        label: 'Domain knowledge',
                        score: grade.industryKnowledge.score,
                        detail: grade.industryKnowledge.summary.split('.')[0] + '.',
                      },
                    ].map(({ label, score, detail }) => (
                      <div
                        key={label}
                        className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 py-4"
                      >
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">{label}</p>
                        <p className={`mt-3 text-3xl ${score >= 80 ? 'text-emerald-300' : score >= 65 ? 'text-primary' : 'text-amber-300'}`}>
                          {score}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white/60">{detail}</p>
                      </div>
                    ))
                  : [
                      ['Code quality', '—', 'Run AI grading to see this score.'],
                      ['Agent judgment', '—', 'Run AI grading to see this score.'],
                      ['Domain knowledge', '—', 'Run AI grading to see this score.'],
                    ].map(([label, score, detail]) => (
                      <div
                        key={label as string}
                        className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 py-4"
                      >
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">{label}</p>
                        <p className="mt-3 text-3xl text-white/25">{score}</p>
                        <p className="mt-2 text-sm leading-6 text-white/40">{detail}</p>
                      </div>
                    ))}
              </div>
            </div>
          </section>

          <section className="mt-6">
            <Tabs defaultValue="grading" className="w-full">
              <TabsList className="w-full justify-start border-b border-white/8 bg-transparent p-0 rounded-none">
                <TabsTrigger
                  value="grading"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-white/55 px-6 py-3"
                >
                  AI Grading
                  {grade && (
                    <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                      {grade.compositeScore}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="review"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-white/55 px-6 py-3"
                >
                  Review
                </TabsTrigger>
                <TabsTrigger
                  value="timeline"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-white/55 px-6 py-3"
                >
                  Timeline
                </TabsTrigger>
                <TabsTrigger
                  value="code"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-white/55 px-6 py-3"
                >
                  Code
                </TabsTrigger>
                <TabsTrigger
                  value="ai"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-white/55 px-6 py-3"
                >
                  AI Usage
                </TabsTrigger>
              </TabsList>

              <TabsContent value="grading" className="mt-6">
                <GradingTab
                  sessionId={sessionId!}
                  initialGrade={grade}
                />
              </TabsContent>

              <TabsContent value="review" className="mt-6">
                <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
                  <div className="editorial-panel rounded-[1.75rem] p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/45">
                      Implementation summary
                    </p>
                    <div className="mt-4 space-y-3">
                      {[
                        `Submission captured ${submission?.total_files ?? 0} file(s) across ${(submission?.total_bytes ?? 0).toLocaleString()} bytes.`,
                        `Command history shows ${stats.total_commands} terminal action(s) and ${stats.total_file_changes} tracked file change event(s).`,
                        stats.total_claude_prompts > 0
                          ? `Agent collaboration is visible and reviewable, with ${stats.total_claude_prompts} prompt(s) and ${stats.total_claude_tool_calls} tool call(s).`
                          : 'No agent collaboration was detected, so the review can focus entirely on direct implementation.',
                      ].map((line) => (
                        <div
                          key={line}
                          className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/70"
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="editorial-panel rounded-[1.75rem] p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/45">
                      Review checklist
                    </p>
                    <div className="mt-4 space-y-3">
                      {[
                        'Check whether Part A landed in the final repo without breaking the existing product shell.',
                        'Check whether Part B feels like a coherent extension instead of an unrelated add-on.',
                        'Compare agent usage against the actual diff and final behavior before scoring judgment.',
                      ].map((line) => (
                        <div
                          key={line}
                          className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/70"
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="mt-6">
                <TimelineTab
                  timeline={timelineData?.timeline ?? []}
                  sessionStartedAt={
                    timelineData?.timeline[0]?.at ?? new Date().toISOString()
                  }
                />
              </TabsContent>

              <TabsContent value="code" className="mt-6">
                <CodeTab
                  sessionId={sessionId!}
                  submission={submission}
                  snapshots={snapshots}
                />
              </TabsContent>

              <TabsContent value="ai" className="mt-6">
                <AIUsageTab
                  sessionId={sessionId!}
                  transcripts={transcripts}
                />
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>
    </div>
  );
}
