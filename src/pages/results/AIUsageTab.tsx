import { useCallback, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Bot, MessageSquare, Wrench } from 'lucide-react';

interface TranscriptMeta {
  id: number;
  claude_session_id: string;
  total_prompts: number;
  total_tool_calls: number;
  total_tokens_in: number;
  total_tokens_out: number;
  collected_at: string;
}

interface AIUsageTabProps {
  sessionId: string;
  transcripts: TranscriptMeta[];
}

interface ParsedMessage {
  type: 'human' | 'assistant' | 'tool_use' | 'tool_result' | 'unknown';
  content?: string;
  tool_name?: string;
  input?: string;
  output?: string;
}

function parseTranscriptJsonl(jsonl: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  for (const line of jsonl.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      messages.push({
        type: parsed.type ?? parsed.role ?? 'unknown',
        content: parsed.content ?? parsed.text ?? parsed.message,
        tool_name: parsed.tool_name ?? parsed.name,
        input: typeof parsed.input === 'string'
          ? parsed.input
          : parsed.input
            ? JSON.stringify(parsed.input, null, 2)
            : undefined,
        output: typeof parsed.output === 'string'
          ? parsed.output
          : parsed.output
            ? JSON.stringify(parsed.output, null, 2)
            : undefined,
      });
    } catch {
      // Skip malformed lines
    }
  }
  return messages;
}

function MessageBubble({ msg }: { msg: ParsedMessage }) {
  if (msg.type === 'tool_use' || msg.type === 'tool_result') {
    return (
      <div className="rounded-xl border border-white/8 bg-black/30 p-3 font-mono text-xs">
        <div className="flex items-center gap-2 text-orange-400">
          <Wrench className="h-3.5 w-3.5" />
          <span className="uppercase tracking-wider">
            {msg.tool_name ?? 'tool'}
          </span>
        </div>
        {msg.input && (
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-white/60">
            {msg.input.length > 500
              ? msg.input.slice(0, 500) + '...'
              : msg.input}
          </pre>
        )}
        {msg.output && (
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-white/50 border-t border-white/8 pt-2">
            {msg.output.length > 500
              ? msg.output.slice(0, 500) + '...'
              : msg.output}
          </pre>
        )}
        {msg.content && !msg.input && !msg.output && (
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-white/60">
            {msg.content.length > 500
              ? msg.content.slice(0, 500) + '...'
              : msg.content}
          </pre>
        )}
      </div>
    );
  }

  const isHuman = msg.type === 'human';

  return (
    <div
      className={`flex ${isHuman ? 'justify-start' : 'justify-end'}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isHuman
            ? 'bg-white/6 text-white/75'
            : 'bg-primary/10 border border-primary/20 text-white/80'
        }`}
      >
        <div className="mb-1 flex items-center gap-2">
          {isHuman ? (
            <MessageSquare className="h-3.5 w-3.5 text-white/40" />
          ) : (
            <Bot className="h-3.5 w-3.5 text-primary/70" />
          )}
          <span className="text-xs uppercase tracking-wider text-white/40">
            {isHuman ? 'User' : 'Claude'}
          </span>
        </div>
        <div className="whitespace-pre-wrap break-words">
          {(msg.content ?? '').length > 1000
            ? (msg.content ?? '').slice(0, 1000) + '...'
            : msg.content}
        </div>
      </div>
    </div>
  );
}

export default function AIUsageTab({ sessionId, transcripts }: AIUsageTabProps) {
  const [loadedTranscripts, setLoadedTranscripts] = useState<
    Record<number, ParsedMessage[]>
  >({});
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [errorIds, setErrorIds] = useState<Set<number>>(() => new Set());

  const totals = transcripts.reduce(
    (acc, t) => ({
      prompts: acc.prompts + t.total_prompts,
      toolCalls: acc.toolCalls + t.total_tool_calls,
      tokensIn: acc.tokensIn + t.total_tokens_in,
      tokensOut: acc.tokensOut + t.total_tokens_out,
    }),
    { prompts: 0, toolCalls: 0, tokensIn: 0, tokensOut: 0 },
  );

  const loadTranscript = useCallback(
    async (transcriptId: number, force = false) => {
      if (loadedTranscripts[transcriptId]) return;
      if (errorIds.has(transcriptId) && !force) return;
      setErrorIds((current) => {
        const next = new Set(current);
        next.delete(transcriptId);
        return next;
      });
      setLoadingId(transcriptId);
      try {
        const res = await apiFetch(
          `/api/sessions/${sessionId}/claude-transcripts/${transcriptId}`,
        );
        if (!res.ok) {
          throw new Error(`Failed to load transcript ${transcriptId}`);
        }
        const data = await res.json();
        const messages = parseTranscriptJsonl(data.transcript_jsonl ?? '');
        setLoadedTranscripts((prev) => ({
          ...prev,
          [transcriptId]: messages,
        }));
      } catch {
        setErrorIds((current) => {
          const next = new Set(current);
          next.add(transcriptId);
          return next;
        });
      } finally {
        setLoadingId(null);
      }
    },
    [sessionId, loadedTranscripts, errorIds],
  );

  if (transcripts.length === 0) {
    return (
      <div className="editorial-panel rounded-[2rem] p-10 text-center">
        <p className="text-white/45">No Claude AI usage recorded for this session.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-6">
        {[
          ['Total Prompts', totals.prompts],
          ['Tool Calls', totals.toolCalls],
          ['Tokens In', totals.tokensIn.toLocaleString()],
          ['Tokens Out', totals.tokensOut.toLocaleString()],
        ].map(([label, value]) => (
          <div
            key={label as string}
            className="editorial-panel rounded-[1.75rem] p-5"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">
              {label}
            </p>
            <p className="mt-3 text-3xl">{value}</p>
          </div>
        ))}
      </div>

      <div className="editorial-panel rounded-[2rem] p-6">
        <Accordion type="single" collapsible className="w-full">
          {transcripts.map((transcript) => (
            <AccordionItem
              key={transcript.id}
              value={String(transcript.id)}
              className="border-white/8"
            >
              <AccordionTrigger
                onClick={() => loadTranscript(transcript.id)}
                className="hover:no-underline py-4"
              >
                <div className="flex items-center gap-4 text-left">
                  <Bot className="h-5 w-5 text-primary/70 shrink-0" />
                  <div>
                    <p className="text-sm text-white/80">
                      Claude Session{' '}
                      <span className="font-mono text-xs text-white/45">
                        {transcript.claude_session_id.slice(0, 8)}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      {transcript.total_prompts} prompts &middot;{' '}
                      {transcript.total_tool_calls} tool calls &middot;{' '}
                      {new Date(transcript.collected_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {loadingId === transcript.id ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : errorIds.has(transcript.id) ? (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <p className="text-center text-sm text-white/45">
                      Failed to load transcript.
                    </p>
                    <button
                      type="button"
                      onClick={() => loadTranscript(transcript.id, true)}
                      className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/70 transition-colors hover:bg-white/8"
                    >
                      Try again
                    </button>
                  </div>
                ) : loadedTranscripts[transcript.id] ? (
                  <div className="space-y-3 py-2">
                    {loadedTranscripts[transcript.id].map((msg, i) => (
                      <MessageBubble key={i} msg={msg} />
                    ))}
                    {loadedTranscripts[transcript.id].length === 0 && (
                      <p className="text-center text-sm text-white/40 py-4">
                        No messages parsed from this transcript.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-sm text-white/40 py-4">
                    Click to load transcript...
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
