import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Editor from '@monaco-editor/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronRight, File, Folder } from 'lucide-react';

interface SnapshotMeta {
  id: string;
  snapshot_at: string;
  file_count: number;
  total_bytes: number;
}

interface Submission {
  id: string;
  files: Record<string, string>;
  submitted_at: string;
}

interface CodeTabProps {
  sessionId: string;
  submission: Submission | null;
  snapshots: SnapshotMeta[];
}

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  isFile: boolean;
}

function findFirstFile(nodes: TreeNode[]): string {
  for (const node of nodes) {
    if (node.isFile) return node.path;
    const nested = findFirstFile(node.children);
    if (nested) return nested;
  }
  return '';
}

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const path of paths.sort()) {
    const parts = path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join('/');

      let existing = current.find((n) => n.name === name);
      if (!existing) {
        existing = { name, path: fullPath, children: [], isFile };
        current.push(existing);
      }
      current = existing.children;
    }
  }

  return root;
}

const LANG_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  json: 'json',
  md: 'markdown',
  css: 'css',
  scss: 'scss',
  html: 'html',
  yml: 'yaml',
  yaml: 'yaml',
  sh: 'shell',
  bash: 'shell',
  sql: 'sql',
  toml: 'toml',
  xml: 'xml',
  svg: 'xml',
  txt: 'plaintext',
};

function getLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return LANG_MAP[ext] ?? 'plaintext';
}

function FileTree({
  nodes,
  selectedPath,
  onSelect,
  depth = 0,
}: {
  nodes: TreeNode[];
  selectedPath: string;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpanded(new Set(nodes.filter((n) => !n.isFile).map((n) => n.path)));
  }, [nodes]);

  return (
    <div>
      {nodes.map((node) => {
        const isExpanded = expanded.has(node.path);

        if (node.isFile) {
          return (
            <button
              key={node.path}
              onClick={() => onSelect(node.path)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                selectedPath === node.path
                  ? 'bg-primary/15 text-primary'
                  : 'text-white/65 hover:bg-white/5 hover:text-white'
              }`}
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
              <File className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{node.name}</span>
            </button>
          );
        }

        return (
          <div key={node.path}>
            <button
              onClick={() =>
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(node.path)) next.delete(node.path);
                  else next.add(node.path);
                  return next;
                })
              }
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-white/55 transition-colors hover:bg-white/5 hover:text-white"
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
              <ChevronRight
                className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              />
              <Folder className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{node.name}</span>
            </button>
            {isExpanded && (
              <FileTree
                nodes={node.children}
                selectedPath={selectedPath}
                onSelect={onSelect}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CodeTab({ sessionId, submission, snapshots }: CodeTabProps) {
  const [selectedSource, setSelectedSource] = useState<string>('submission');
  const [files, setFiles] = useState<Record<string, string>>(
    submission?.files ?? {},
  );
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);

  const tree = useMemo(() => buildTree(Object.keys(files)), [files]);

  // Select first file when files change
  useEffect(() => {
    const firstFile = findFirstFile(tree);
    if (firstFile && (!selectedFile || files[selectedFile] === undefined)) {
      setSelectedFile(firstFile);
    }
  }, [files, selectedFile, tree]);

  const loadSnapshot = useCallback(
    async (snapshotId: string) => {
      setLoadingSnapshot(true);
      try {
        const res = await apiFetch(
          `/api/sessions/${sessionId}/snapshots/${snapshotId}`,
        );
        if (res.ok) {
          const data = await res.json();
          setFiles(data.files ?? {});
        }
      } catch {
        // Silently fail — user can try again
      } finally {
        setLoadingSnapshot(false);
      }
    },
    [sessionId],
  );

  function handleSourceChange(value: string) {
    setSelectedSource(value);
    if (value === 'submission') {
      setFiles(submission?.files ?? {});
    } else {
      loadSnapshot(value);
    }
  }

  const fileContent = files[selectedFile] ?? '';

  if (!submission && snapshots.length === 0) {
    return (
      <div className="editorial-panel rounded-[2rem] p-10 text-center">
        <p className="text-white/45">No code submissions or snapshots available.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Select value={selectedSource} onValueChange={handleSourceChange}>
          <SelectTrigger className="w-72 rounded-full border-white/10 bg-white/5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {submission && (
              <SelectItem value="submission">
                Final Submission ({new Date(submission.submitted_at).toLocaleString()})
              </SelectItem>
            )}
            {snapshots.map((snap) => (
              <SelectItem key={snap.id} value={snap.id}>
                Snapshot — {new Date(snap.snapshot_at).toLocaleString()} ({snap.file_count} files)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="editorial-panel rounded-[2rem] overflow-hidden">
        <div className="flex min-h-[500px]">
          {/* File tree */}
          <div className="w-64 shrink-0 border-r border-white/8 p-3 overflow-y-auto">
            {loadingSnapshot ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <FileTree
                nodes={tree}
                selectedPath={selectedFile}
                onSelect={setSelectedFile}
              />
            )}
            {!loadingSnapshot && tree.length === 0 && (
              <div className="px-2 py-6 text-sm text-white/40">
                No files were captured for this source yet.
              </div>
            )}
          </div>

          {/* Editor */}
          <div className="flex-1 min-w-0">
            {selectedFile ? (
              <Editor
                height="500px"
                language={getLanguage(selectedFile)}
                value={fileContent}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-white/35 text-sm">
                Select a file to view
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
