import { useMemo, useState } from 'react';
import {
  Terminal,
  FilePlus,
  FileEdit,
  FileX,
  FileSymlink,
  MessageSquare,
  Bot,
  Wrench,
  Camera,
  Eye,
} from 'lucide-react';

interface TimelineEntry {
  at: string;
  type: string;
  detail?: string | null;
  snapshot_id?: number;
}

interface TimelineTabProps {
  timeline: TimelineEntry[];
  sessionStartedAt: string;
}

type FilterType = 'all' | 'commands' | 'files' | 'ai' | 'snapshots';

const EVENT_ICONS: Record<string, React.ElementType> = {
  command_run: Terminal,
  file_create: FilePlus,
  file_modify: FileEdit,
  file_delete: FileX,
  file_move: FileSymlink,
  claude_prompt: MessageSquare,
  claude_response: Bot,
  claude_tool_use: Wrench,
  snapshot: Camera,
  focus_change: Eye,
};

const EVENT_COLORS: Record<string, string> = {
  command_run: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  file_create: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  file_modify: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  file_delete: 'text-rose-400 border-rose-400/30 bg-rose-400/10',
  file_move: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  claude_prompt: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
  claude_response: 'text-cyan-300 border-cyan-300/30 bg-cyan-300/10',
  claude_tool_use: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
  snapshot: 'text-white/60 border-white/20 bg-white/5',
  focus_change: 'text-white/40 border-white/15 bg-white/5',
};

const FILTER_TYPES: Record<FilterType, string[]> = {
  all: [],
  commands: ['command_run'],
  files: ['file_create', 'file_modify', 'file_delete', 'file_move'],
  ai: ['claude_prompt', 'claude_response', 'claude_tool_use'],
  snapshots: ['snapshot'],
};

const INITIAL_LIMIT = 200;

function formatElapsed(startMs: number, eventMs: number): string {
  const diffSec = Math.floor((eventMs - startMs) / 1000);
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function TimelineTab({ timeline, sessionStartedAt }: TimelineTabProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [limit, setLimit] = useState(INITIAL_LIMIT);

  const startMs = new Date(sessionStartedAt).getTime();

  const filtered = useMemo(() => {
    if (filter === 'all') return timeline;
    const types = FILTER_TYPES[filter];
    return timeline.filter((e) => types.includes(e.type));
  }, [timeline, filter]);

  const visible = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;

  if (timeline.length === 0) {
    return (
      <div className="editorial-panel rounded-[2rem] p-10 text-center">
        <p className="text-white/45">No activity events recorded for this session.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {(Object.keys(FILTER_TYPES) as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setLimit(INITIAL_LIMIT);
            }}
            className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.25em] transition-colors ${
              filter === f
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-white/10 bg-white/4 text-white/55 hover:bg-white/8'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="editorial-panel rounded-[2rem] p-6">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-white/10" />

          <div className="space-y-1">
            {visible.map((entry, i) => {
              const Icon = EVENT_ICONS[entry.type] ?? Eye;
              const color = EVENT_COLORS[entry.type] ?? 'text-white/40 border-white/15 bg-white/5';
              const elapsed = formatElapsed(startMs, new Date(entry.at).getTime());

              return (
                <div key={i} className="relative flex items-start gap-4 py-2 pl-1">
                  <div
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1 pt-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-white/40">{elapsed}</span>
                      <span className="text-xs uppercase tracking-[0.2em] text-white/50">
                        {entry.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {entry.detail && (
                      <p className="mt-1 truncate font-mono text-sm text-white/70">
                        {entry.detail}
                      </p>
                    )}
                    {entry.snapshot_id != null && (
                      <p className="mt-1 text-xs text-white/40">
                        Snapshot #{entry.snapshot_id}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {hasMore && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setLimit((prev) => prev + INITIAL_LIMIT)}
              className="rounded-full border border-white/10 bg-white/4 px-6 py-2 text-xs uppercase tracking-[0.25em] text-white/55 transition-colors hover:bg-white/8"
            >
              Load more ({filtered.length - limit} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
