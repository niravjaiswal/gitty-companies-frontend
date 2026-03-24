import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GlassNav from '@/components/GlassNav';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Clock, Terminal, FileCode, Bot, Wifi } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TimelineTab from './results/TimelineTab';
import CodeTab from './results/CodeTab';
import AIUsageTab from './results/AIUsageTab';

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

export default function CandidateResult() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [transcripts, setTranscripts] = useState<TranscriptMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const [timelineRes, submissionRes, snapshotsRes, transcriptsRes] =
          await Promise.all([
            apiFetch(`/api/sessions/${sessionId}/timeline`),
            apiFetch(`/api/sessions/${sessionId}/submission`),
            apiFetch(`/api/sessions/${sessionId}/snapshots`),
            apiFetch(`/api/sessions/${sessionId}/claude-transcripts`),
          ]);

        if (!timelineRes.ok) throw new Error('Failed to load timeline');

        const tData = await timelineRes.json();
        setTimelineData(tData);

        if (submissionRes.ok) {
          setSubmission(await submissionRes.json());
        }

        if (snapshotsRes.ok) {
          const sData = await snapshotsRes.json();
          setSnapshots(sData.snapshots ?? []);
        }

        if (transcriptsRes.ok) {
          const trData = await transcriptsRes.json();
          setTranscripts(trData.transcripts ?? []);
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

          <section className="mt-6">
            <Tabs defaultValue="timeline" className="w-full">
              <TabsList className="w-full justify-start border-b border-white/8 bg-transparent p-0 rounded-none">
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
