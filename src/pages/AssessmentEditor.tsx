import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import '@vscode/codicons/dist/codicon.css';
import GlassNav from '@/components/GlassNav';
import LiquidButton from '@/components/LiquidButton';
import { apiFetch } from '@/lib/api';
import { parseAssessmentBrief } from '@/lib/assessmentBrief';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { getFileIconClass } from '@/components/IDE/FileExplorer/fileIcons';
import { ArrowLeft, Save, WandSparkles } from 'lucide-react';

interface AssessmentDetail {
  id: string;
  title: string;
  summary: string;
  instructionsMd: string;
  workspaceFileCount: number;
  workspaceEntryFile: string | null;
  workspaceGeneratedAt: string | null;
  workspaceFiles: Record<string, string>;
  generationStatus: 'pending' | 'processing' | 'completed' | 'failed' | null;
}

interface ConsoleMessage {
  id: string;
  role: 'user' | 'assistant';
  title: string;
  body: string;
}

interface AgentLane {
  id: string;
  name: string;
  status: string;
  output: string;
}

function getLanguage(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    css: 'css',
    html: 'html',
    md: 'markdown',
    rs: 'rust',
    go: 'go',
    py: 'python',
    sql: 'sql',
    yml: 'yaml',
    yaml: 'yaml',
    sh: 'shell',
  };
  return map[extension] ?? 'plaintext';
}

function formatFileName(filePath: string): string {
  const parts = filePath.split('/');
  return parts[parts.length - 1] || filePath;
}

export default function AssessmentEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [draftFiles, setDraftFiles] = useState<Record<string, string>>({});
  const [selectedFilePath, setSelectedFilePath] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consoleInput, setConsoleInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([
    {
      id: 'assistant-initial',
      role: 'assistant',
      title: 'Gitty',
      body:
        'Repo loaded. Ask for a reviewer pass, patch plan, or test sweep before you send the assessment.',
    },
  ]);
  const [agentLanes, setAgentLanes] = useState<AgentLane[]>([
    {
      id: 'lane-review',
      name: 'Reviewer agent',
      status: 'Ready',
      output: 'Watching for UI regressions, missing acceptance criteria, and reviewer-facing polish gaps.',
    },
    {
      id: 'lane-patch',
      name: 'Patch agent',
      status: 'Idle',
      output: 'No queued patch yet. Dispatch from chat to simulate a code-editing pass.',
    },
    {
      id: 'lane-tests',
      name: 'Test agent',
      status: 'Idle',
      output: 'No validation run queued yet.',
    },
  ]);

  async function load() {
    if (!id) return;
    setError(null);

    try {
      const res = await apiFetch(`/api/company/assessments/${id}`);
      if (!res.ok) {
        throw new Error('Failed to load assessment editor');
      }

      const data = (await res.json()) as AssessmentDetail;
      const hasFiles = Object.keys(data.workspaceFiles ?? {}).length > 0;
      const inFlightOrFailed =
        data.generationStatus === 'pending' ||
        data.generationStatus === 'processing' ||
        data.generationStatus === 'failed';
      if (inFlightOrFailed && !hasFiles) {
        navigate(`/dashboard/assessments/${data.id}/generation`, { replace: true });
        return;
      }
      const filePaths = Object.keys(data.workspaceFiles ?? {}).sort((left, right) =>
        left.localeCompare(right),
      );
      const preferredFile =
        data.workspaceEntryFile && data.workspaceFiles[data.workspaceEntryFile]
          ? data.workspaceEntryFile
          : filePaths[0] ?? '';

      setAssessment(data);
      setDraftFiles(data.workspaceFiles ?? {});
      setSelectedFilePath((current) =>
        current && data.workspaceFiles[current] !== undefined ? current : preferredFile,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment editor');
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const filePaths = useMemo(
    () => Object.keys(draftFiles).sort((left, right) => left.localeCompare(right)),
    [draftFiles],
  );

  const selectedFileContent = selectedFilePath ? draftFiles[selectedFilePath] ?? '' : '';
  const isDirty =
    JSON.stringify(draftFiles) !== JSON.stringify(assessment?.workspaceFiles ?? {});
  const briefSections = parseAssessmentBrief(assessment?.instructionsMd ?? '');
  const problemStatement = [
    '# Gitty Sprint',
    '',
    '## Part A',
    '',
    briefSections.partA || 'No Part A instructions available yet.',
    '',
    '## Part B',
    '',
    briefSections.partB || 'No Part B instructions available yet.',
  ].join('\n');
  function updateSelectedFile(content: string | undefined) {
    if (!selectedFilePath || content === undefined) return;
    setDraftFiles((current) => ({
      ...current,
      [selectedFilePath]: content,
    }));
  }

  async function handleSave() {
    if (!id || !assessment) return;
    setSaving(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/company/assessments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceFiles: draftFiles,
          workspaceEntryFile: assessment.workspaceEntryFile,
          regenerateWorkspace: false,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to save assessment files');
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save assessment files');
    } finally {
      setSaving(false);
    }
  }

  function pushConsoleMessage(message: ConsoleMessage) {
    setConsoleMessages((current) => [...current, message]);
  }

  function runConsoleCommand(rawPrompt: string) {
    const prompt = rawPrompt.trim();
    if (!prompt) return;

    pushConsoleMessage({
      id: `user-${Date.now()}`,
      role: 'user',
      title: 'Company prompt',
      body: prompt,
    });

    const normalized = prompt.toLowerCase();
    const patchResponse = normalized.includes('patch') || normalized.includes('change');
    const testResponse = normalized.includes('test') || normalized.includes('qa');
    const reviewResponse = normalized.includes('review') || normalized.includes('brief');

    setAgentLanes((current) =>
      current.map((lane) => {
        if (lane.id === 'lane-patch' && patchResponse) {
          return {
            ...lane,
            status: 'Queued',
            output: `Preparing a patch plan for ${selectedFilePath || assessment?.workspaceEntryFile || 'the current workspace'}.`,
          };
        }

        if (lane.id === 'lane-tests' && testResponse) {
          return {
            ...lane,
            status: 'Queued',
            output: 'Staging a Codex-style validation run across tests, behavior, and reviewer notes.',
          };
        }

        if (lane.id === 'lane-review' && reviewResponse) {
          return {
            ...lane,
            status: 'Reviewing',
            output: 'Summarizing implementation scope, repo context, and send-readiness for the hiring team.',
          };
        }

        return lane;
      }),
    );

    const responseBody = [
      reviewResponse
        ? `Reviewer agent: the brief is aligned with ${assessment?.title || 'the assessment'} and the workspace entry file remains ${assessment?.workspaceEntryFile || 'unset'}.`
        : null,
      patchResponse
        ? `Patch agent: propose edits around ${selectedFilePath || assessment?.workspaceEntryFile || 'the current file'} before submission.`
        : null,
      testResponse
        ? 'Test agent: stage a final pass that checks the generated repo narrative, candidate instructions, and validation hooks before assigning.'
        : null,
      !reviewResponse && !patchResponse && !testResponse
        ? 'Coordinator: queued a general repo review. Ask for a patch, review, or test sweep to update the agent lanes.'
        : null,
    ]
      .filter(Boolean)
      .join('\n\n');

    pushConsoleMessage({
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      title: 'Gitty',
      body: responseBody,
    });
    setConsoleInput('');
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlassNav variant="company" />
      <div className="editorial-grid min-h-screen px-6 pb-16 pt-28">
        <div className="mx-auto flex w-full max-w-7xl flex-col">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <button
                onClick={() => navigate(`/dashboard/send/${assessment.id}`)}
                className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to assignment studio
              </button>
              <h1 className="mt-4 text-3xl md:text-5xl">{assessment.title}</h1>
              <p className="mt-2 text-sm text-white/58">
                Review and edit the generated assessment files before candidates open them.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-3 text-right">
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">Workspace</p>
                <p className="mt-2 text-lg">{assessment.workspaceFileCount} files</p>
              </div>
              <LiquidButton
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="h-12 rounded-full px-6"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save files'}
              </LiquidButton>
            </div>
          </div>

          {error && <p className="mb-4 text-sm text-red-300">{error}</p>}

          {filePaths.length === 0 ? (
            <div className="editorial-panel flex flex-1 items-center justify-center rounded-[2rem] p-10 text-center">
              <div>
                <h2 className="text-2xl">No generated files found.</h2>
                <p className="mt-3 text-sm text-white/58">
                  This assessment does not have a generated workspace yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
              <section className="editorial-panel h-fit rounded-[1.65rem] border border-white/8 bg-[#111215]/90 p-0 overflow-hidden xl:sticky xl:top-24">
                <div className="flex items-center justify-between gap-4 border-b border-white/8 bg-[#181a1f] px-5 py-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-[#f97316]">Problem statement</p>
                    <p className="mt-2 text-sm text-white/55">
                      Candidate-facing brief preview before the company sends the assessment.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/52">
                    Candidate view
                  </span>
                </div>

                <div className="bg-[#0f1115] px-5 py-5">
                  <pre className="max-h-[720px] overflow-auto whitespace-pre-wrap rounded-[1rem] border border-white/8 bg-[#0b0d10] p-4 font-mono text-[13px] leading-6 text-[#d4d4d4]">
                    {problemStatement}
                  </pre>
                </div>
              </section>

              <section className="overflow-hidden rounded-[1.65rem] border border-white/8 bg-[#1e1e1e] shadow-[0_22px_60px_rgba(0,0,0,0.32)]">
                <div className="flex h-9 items-center gap-2 border-b border-[#2a2d2e] bg-[#181818] px-4">
                  <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                  <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                  <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                  <div className="ml-4 rounded-md bg-[#23252b] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[#9da1a6]">
                    assessment workspace
                  </div>
                  <div className="ml-auto text-[11px] uppercase tracking-[0.22em] text-[#6f7681]">
                    {assessment.workspaceGeneratedAt
                      ? `Generated ${new Date(assessment.workspaceGeneratedAt).toLocaleString()}`
                      : 'Generated workspace'}
                  </div>
                </div>

                <div className="flex h-10 items-center border-b border-[#2a2d2e] bg-[#252526] px-3">
                  <div className="flex h-full items-end">
                    <div className="flex h-full items-center gap-2 border-r border-[#2a2d2e] bg-[#1e1e1e] px-4 text-[#cccccc]">
                      <span className={`codicon ${getFileIconClass(formatFileName(selectedFilePath))} text-[14px] opacity-80`} />
                      <span className="text-[13px]">{formatFileName(selectedFilePath)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid min-h-[860px] lg:grid-cols-[280px_minmax(0,1fr)]">
                  <aside className="border-r border-[#2a2d2e] bg-[#252526]">
                    <div className="border-b border-[#2a2d2e] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-[#bbbbbb]">Explorer</p>
                      <p className="mt-2 text-xs text-[#8f9399]">
                        {assessment.workspaceEntryFile
                          ? `Entry: ${assessment.workspaceEntryFile}`
                          : 'Select a file to inspect'}
                      </p>
                    </div>
                    <div className="overflow-visible py-2">
                      {filePaths.map((filePath) => {
                        const active = filePath === selectedFilePath;
                        return (
                          <button
                            key={filePath}
                            onClick={() => setSelectedFilePath(filePath)}
                            className={`flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] transition-colors ${
                              active
                                ? 'bg-[#37373d] text-[#ffffff]'
                                : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                            }`}
                          >
                            <span className={`codicon ${getFileIconClass(formatFileName(filePath))} text-[14px] text-[#8cdcfe] opacity-90`} />
                            <span className="truncate">{filePath}</span>
                          </button>
                        );
                      })}
                    </div>
                  </aside>

                  <div className="min-h-0 overflow-hidden bg-[#1e1e1e]">
                    <div className="flex h-10 items-center justify-between border-b border-[#2a2d2e] bg-[#1e1e1e] px-4">
                      <div className="text-[12px] text-[#cccccc]">{selectedFilePath}</div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-[#8f9399]">
                        {getLanguage(selectedFilePath)}
                      </div>
                    </div>
                    <div className="h-[810px]">
                      <Editor
                        key={selectedFilePath}
                        path={selectedFilePath}
                        defaultLanguage={getLanguage(selectedFilePath)}
                        defaultValue={selectedFileContent}
                        onChange={updateSelectedFile}
                        theme="vs-dark"
                        options={{
                          fontSize: 14,
                          minimap: { enabled: true },
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          padding: { top: 10 },
                          tabSize: 2,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex h-16 w-16 items-center justify-center rounded-full border border-[#ff7a1a]/30 bg-[#16181d] shadow-[0_16px_40px_rgba(0,0,0,0.45)] transition-transform hover:scale-[1.03] hover:border-[#ff7a1a]/60"
        aria-label="Open Gitty chat"
      >
        <img src="/gitty.png" alt="Gitty" className="h-9 w-9 rounded-full object-cover" />
      </button>

      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="right" className="w-[420px] border-white/10 bg-[#111215] text-white sm:max-w-[420px]">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ff7a1a]/30 bg-[#1a1d22]">
                <img src="/gitty.png" alt="Gitty" className="h-7 w-7 rounded-full object-cover" />
              </div>
              <div>
                <SheetTitle className="text-left text-white">Gitty chat</SheetTitle>
                <p className="mt-1 text-sm text-white/55">Review repo changes and send-readiness.</p>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-3">
            {consoleMessages.map((message) => (
              <div
                key={message.id}
                className={`rounded-[1rem] border px-4 py-3 ${
                  message.role === 'assistant'
                    ? 'border-[#ff7a1a]/20 bg-[#1a1714]'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                  {message.title}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/72">
                  {message.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              'Review the repo before sending',
              'Queue a patch for the current file',
              'Run a final test sweep',
            ].map((preset) => (
              <button
                key={preset}
                onClick={() => runConsoleCommand(preset)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/58 transition-colors hover:bg-white/[0.08]"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            <Input
              value={consoleInput}
              onChange={(event) => setConsoleInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  runConsoleCommand(consoleInput);
                }
              }}
              className="h-11 rounded-full border-white/10 bg-white/[0.04]"
              placeholder="Type a prompt..."
            />
            <button
              onClick={() => runConsoleCommand(consoleInput)}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[#ff7a1a]/25 bg-[#ff7a1a]/10 px-4 text-sm text-[#ff9a52] transition-colors hover:bg-[#ff7a1a]/20"
            >
              <WandSparkles className="h-4 w-4" />
              Send
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
