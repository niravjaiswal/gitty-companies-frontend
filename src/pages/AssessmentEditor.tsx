import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import GlassNav from '@/components/GlassNav';
import LiquidButton from '@/components/LiquidButton';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Save } from 'lucide-react';

interface AssessmentDetail {
  id: string;
  title: string;
  summary: string;
  workspaceFileCount: number;
  workspaceEntryFile: string | null;
  workspaceGeneratedAt: string | null;
  workspaceFiles: Record<string, string>;
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

  async function load() {
    if (!id) return;
    setError(null);

    try {
      const res = await apiFetch(`/api/company/assessments/${id}`);
      if (!res.ok) {
        throw new Error('Failed to load assessment editor');
      }

      const data = (await res.json()) as AssessmentDetail;
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
      <div className="editorial-grid min-h-screen px-6 pb-10 pt-24">
        <div className="mx-auto flex h-[calc(100vh-8rem)] w-full max-w-[1600px] flex-col">
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
            <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="editorial-panel min-h-0 rounded-[2rem] p-4">
                <div className="mb-4 border-b border-white/10 px-3 pb-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Files</p>
                  <p className="mt-2 text-sm text-white/65">
                    {assessment.workspaceEntryFile
                      ? `Entry: ${assessment.workspaceEntryFile}`
                      : 'Select a file to inspect'}
                  </p>
                </div>
                <div className="max-h-full space-y-2 overflow-auto pr-2">
                  {filePaths.map((filePath) => {
                    const active = filePath === selectedFilePath;
                    return (
                      <button
                        key={filePath}
                        onClick={() => setSelectedFilePath(filePath)}
                        className={`w-full rounded-[1.2rem] border px-3 py-3 text-left transition-colors ${
                          active
                            ? 'border-primary/50 bg-primary/10'
                            : 'border-white/8 bg-black/10 hover:bg-white/[0.06]'
                        }`}
                      >
                        <p className="truncate text-sm text-white">{formatFileName(filePath)}</p>
                        <p className="mt-1 truncate text-xs text-white/38">{filePath}</p>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="editorial-panel min-h-0 overflow-hidden rounded-[2rem]">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-white/40">Current file</p>
                    <p className="mt-2 text-sm text-white/75">{selectedFilePath}</p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/35">
                    {assessment.workspaceGeneratedAt
                      ? `Generated ${new Date(assessment.workspaceGeneratedAt).toLocaleString()}`
                      : 'Generated workspace'}
                  </p>
                </div>
                <div className="h-[calc(100%-73px)]">
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
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
