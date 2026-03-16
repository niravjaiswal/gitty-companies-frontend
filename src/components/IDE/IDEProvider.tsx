import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A node in the file explorer tree. */
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

/** An open editor tab. */
export interface OpenTab {
  path: string;
  name: string;
  language: string;
  content: string;
  savedContent: string;
  isDirty: boolean;
}

/** Public value exposed by the IDE context. */
export interface IDEContextValue {
  fileTree: FileNode[];
  openTabs: OpenTab[];
  activeTabPath: string | null;

  loadDirectory: (path: string) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  updateTabContent: (path: string, content: string) => void;
  saveFile: (path: string) => Promise<void>;
  createFile: (parentPath: string, name: string) => Promise<void>;
  createDirectory: (parentPath: string, name: string) => Promise<void>;
  renameEntry: (oldPath: string, newName: string) => Promise<void>;
  deleteEntry: (path: string) => Promise<void>;
  refreshTree: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

/**
 * Returns the Monaco editor language identifier for a given file path.
 * Falls back to `'plaintext'` for unknown extensions.
 */
export function getLanguageFromPath(filePath: string): string {
  const ext = filePath.includes('.')
    ? '.' + filePath.split('.').pop()!.toLowerCase()
    : '';
  const map: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.json': 'json',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.md': 'markdown',
    '.py': 'python',
    '.sh': 'shell',
    '.bash': 'shell',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.xml': 'xml',
    '.sql': 'sql',
    '.rs': 'rust',
    '.go': 'go',
    '.java': 'java',
    '.c': 'c',
    '.h': 'c',
    '.cpp': 'cpp',
    '.hpp': 'cpp',
  };
  return map[ext] || 'plaintext';
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/** Extract the parent directory from a full path. */
function getParentPath(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/');
}

/** Extract the filename (last segment) from a full path. */
function getBaseName(path: string): string {
  return path.split('/').pop() || '';
}

// ---------------------------------------------------------------------------
// Tree helpers (immutable)
// ---------------------------------------------------------------------------

/** Recursively find a node by its path. */
function findNode(tree: FileNode[], path: string): FileNode | null {
  for (const node of tree) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findNode(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Return a new tree where the node at `path` is replaced by
 * `updater(existingNode)`. The rest of the tree is structurally shared.
 */
function updateNodeInTree(
  tree: FileNode[],
  path: string,
  updater: (node: FileNode) => FileNode,
): FileNode[] {
  return tree.map((node) => {
    if (node.path === path) {
      return updater(node);
    }
    if (node.children) {
      const updatedChildren = updateNodeInTree(node.children, path, updater);
      // Only create a new object if the children actually changed.
      if (updatedChildren !== node.children) {
        return { ...node, children: updatedChildren };
      }
    }
    return node;
  });
}

/** Collect all expanded directory paths in a tree. */
function collectExpandedPaths(tree: FileNode[]): string[] {
  const result: string[] = [];
  for (const node of tree) {
    if (node.type === 'directory' && node.isExpanded) {
      result.push(node.path);
      if (node.children) {
        result.push(...collectExpandedPaths(node.children));
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

interface IDEState {
  fileTree: FileNode[];
  openTabs: OpenTab[];
  activeTabPath: string | null;
}

type IDEAction =
  | { type: 'SET_FILE_TREE'; payload: FileNode[] }
  | { type: 'SET_NODE_CHILDREN'; payload: { path: string; children: FileNode[] } }
  | { type: 'SET_NODE_LOADING'; payload: { path: string; isLoading: boolean } }
  | { type: 'SET_NODE_EXPANDED'; payload: { path: string; isExpanded: boolean } }
  | { type: 'ADD_TAB'; payload: OpenTab }
  | { type: 'CLOSE_TAB'; payload: { path: string } }
  | { type: 'SET_ACTIVE_TAB'; payload: { path: string } }
  | { type: 'UPDATE_TAB_CONTENT'; payload: { path: string; content: string } }
  | { type: 'MARK_TAB_SAVED'; payload: { path: string } }
  | { type: 'UPDATE_TAB_PATH'; payload: { oldPath: string; newPath: string; newName: string } };

function ideReducer(state: IDEState, action: IDEAction): IDEState {
  switch (action.type) {
    case 'SET_FILE_TREE':
      return { ...state, fileTree: action.payload };

    case 'SET_NODE_CHILDREN': {
      const { path, children } = action.payload;
      return {
        ...state,
        fileTree: updateNodeInTree(state.fileTree, path, (node) => ({
          ...node,
          children,
          isExpanded: true,
          isLoading: false,
        })),
      };
    }

    case 'SET_NODE_LOADING': {
      const { path, isLoading } = action.payload;
      return {
        ...state,
        fileTree: updateNodeInTree(state.fileTree, path, (node) => ({
          ...node,
          isLoading,
        })),
      };
    }

    case 'SET_NODE_EXPANDED': {
      const { path, isExpanded } = action.payload;
      return {
        ...state,
        fileTree: updateNodeInTree(state.fileTree, path, (node) => ({
          ...node,
          isExpanded,
        })),
      };
    }

    case 'ADD_TAB': {
      // Guard against duplicates
      if (state.openTabs.some((t) => t.path === action.payload.path)) {
        return state;
      }
      return { ...state, openTabs: [...state.openTabs, action.payload] };
    }

    case 'CLOSE_TAB': {
      const { path } = action.payload;
      const idx = state.openTabs.findIndex((t) => t.path === path);
      if (idx === -1) return state;

      const newTabs = state.openTabs.filter((t) => t.path !== path);
      let newActive = state.activeTabPath;

      if (state.activeTabPath === path) {
        if (newTabs.length === 0) {
          newActive = null;
        } else if (idx > 0) {
          newActive = newTabs[idx - 1].path;
        } else {
          newActive = newTabs[0].path;
        }
      }

      return { ...state, openTabs: newTabs, activeTabPath: newActive };
    }

    case 'SET_ACTIVE_TAB':
      return { ...state, activeTabPath: action.payload.path };

    case 'UPDATE_TAB_CONTENT': {
      const { path, content } = action.payload;
      return {
        ...state,
        openTabs: state.openTabs.map((t) =>
          t.path === path
            ? { ...t, content, isDirty: content !== t.savedContent }
            : t,
        ),
      };
    }

    case 'MARK_TAB_SAVED': {
      const { path } = action.payload;
      return {
        ...state,
        openTabs: state.openTabs.map((t) =>
          t.path === path
            ? { ...t, savedContent: t.content, isDirty: false }
            : t,
        ),
      };
    }

    case 'UPDATE_TAB_PATH': {
      const { oldPath, newPath, newName } = action.payload;
      return {
        ...state,
        openTabs: state.openTabs.map((t) =>
          t.path === oldPath
            ? {
                ...t,
                path: newPath,
                name: newName,
                language: getLanguageFromPath(newPath),
              }
            : t,
        ),
        activeTabPath:
          state.activeTabPath === oldPath ? newPath : state.activeTabPath,
      };
    }

    default:
      return state;
  }
}

const initialState: IDEState = {
  fileTree: [],
  openTabs: [],
  activeTabPath: null,
};

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function apiFetchTree(
  sessionId: string,
  path: string,
): Promise<FileNode[]> {
  const res = await apiFetch(
    `/api/sessions/${sessionId}/files/tree?path=${encodeURIComponent(path)}&depth=1`,
  );
  if (!res.ok) throw new Error(`Failed to load directory: ${res.statusText}`);
  const data = await res.json();
  return (data.entries as Array<{ name: string; path: string; type: 'file' | 'directory' }>).map(
    (e) => ({
      name: e.name,
      path: e.path,
      type: e.type,
    }),
  );
}

async function apiFetchFile(
  sessionId: string,
  path: string,
): Promise<string> {
  const res = await apiFetch(
    `/api/sessions/${sessionId}/files?path=${encodeURIComponent(path)}`,
  );
  if (!res.ok) throw new Error(`Failed to read file: ${res.statusText}`);
  const data = await res.json();
  return data.content as string;
}

async function apiWriteFile(
  sessionId: string,
  path: string,
  content: string,
): Promise<void> {
  const res = await apiFetch(`/api/sessions/${sessionId}/files`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  });
  if (!res.ok) throw new Error(`Failed to save file: ${res.statusText}`);
}

async function apiCreateEntry(
  sessionId: string,
  path: string,
  type: 'file' | 'directory',
): Promise<void> {
  const res = await apiFetch(
    `/api/sessions/${sessionId}/files/create`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, type }),
    },
  );
  if (!res.ok) throw new Error(`Failed to create ${type}: ${res.statusText}`);
}

async function apiRenameEntry(
  sessionId: string,
  oldPath: string,
  newPath: string,
): Promise<void> {
  const res = await apiFetch(
    `/api/sessions/${sessionId}/files/rename`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath }),
    },
  );
  if (!res.ok) throw new Error(`Failed to rename: ${res.statusText}`);
}

async function apiDeleteEntry(
  sessionId: string,
  path: string,
): Promise<void> {
  const res = await apiFetch(
    `/api/sessions/${sessionId}/files?path=${encodeURIComponent(path)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error(`Failed to delete: ${res.statusText}`);
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const IDEContext = createContext<IDEContextValue | null>(null);

/**
 * Hook to access the IDE context. Must be used within an `<IDEProvider>`.
 * @throws if used outside of an IDEProvider.
 */
export function useIDE(): IDEContextValue {
  const ctx = useContext(IDEContext);
  if (!ctx) throw new Error('useIDE must be used within IDEProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface IDEProviderProps {
  sessionId: string;
  children: React.ReactNode;
}

/**
 * Provides IDE state (file tree, open tabs, active editor) to all descendant
 * components. Wrap the IDE layout with this provider and pass in the sandbox
 * `sessionId`.
 */
export function IDEProvider({ sessionId, children }: IDEProviderProps) {
  const [state, dispatch] = useReducer(ideReducer, initialState);

  // We use a ref so async callbacks always see the latest state without
  // needing to re-create every closure.
  const stateRef = useRef(state);
  stateRef.current = state;

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  const loadDirectory = useCallback(
    async (path: string) => {
      // If the directory is already expanded, collapse it (toggle behavior).
      const currentNode = findNode(stateRef.current.fileTree, path);
      if (currentNode?.isExpanded) {
        dispatch({ type: 'SET_NODE_EXPANDED', payload: { path, isExpanded: false } });
        return;
      }

      dispatch({ type: 'SET_NODE_LOADING', payload: { path, isLoading: true } });
      try {
        const entries = await apiFetchTree(sessionId, path);

        // Preserve expansion state of existing children.
        const existingChildren = currentNode?.children;
        const merged = entries.map((entry) => {
          if (entry.type === 'directory' && existingChildren) {
            const prev = existingChildren.find((c) => c.path === entry.path);
            if (prev) {
              return {
                ...entry,
                children: prev.children,
                isExpanded: prev.isExpanded,
              };
            }
          }
          return entry;
        });

        dispatch({
          type: 'SET_NODE_CHILDREN',
          payload: { path, children: merged },
        });
      } catch (err) {
        dispatch({ type: 'SET_NODE_LOADING', payload: { path, isLoading: false } });
        toast.error(
          err instanceof Error ? err.message : 'Failed to load directory',
        );
      }
    },
    [sessionId],
  );

  const openFile = useCallback(
    async (path: string) => {
      // If already open, just activate.
      const existing = stateRef.current.openTabs.find((t) => t.path === path);
      if (existing) {
        dispatch({ type: 'SET_ACTIVE_TAB', payload: { path } });
        return;
      }

      try {
        const content = await apiFetchFile(sessionId, path);
        const tab: OpenTab = {
          path,
          name: getBaseName(path),
          language: getLanguageFromPath(path),
          content,
          savedContent: content,
          isDirty: false,
        };
        dispatch({ type: 'ADD_TAB', payload: tab });
        dispatch({ type: 'SET_ACTIVE_TAB', payload: { path } });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to open file',
        );
      }
    },
    [sessionId],
  );

  const closeTab = useCallback((path: string) => {
    dispatch({ type: 'CLOSE_TAB', payload: { path } });
  }, []);

  const setActiveTab = useCallback((path: string) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: { path } });
  }, []);

  const updateTabContent = useCallback((path: string, content: string) => {
    dispatch({ type: 'UPDATE_TAB_CONTENT', payload: { path, content } });
  }, []);

  const saveFile = useCallback(
    async (path: string) => {
      const tab = stateRef.current.openTabs.find((t) => t.path === path);
      if (!tab) return;

      try {
        await apiWriteFile(sessionId, path, tab.content);
        dispatch({ type: 'MARK_TAB_SAVED', payload: { path } });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to save file',
        );
      }
    },
    [sessionId],
  );

  const createFile = useCallback(
    async (parentPath: string, name: string) => {
      const fullPath = parentPath + '/' + name;
      try {
        await apiCreateEntry(sessionId, fullPath, 'file');
        await loadDirectory(parentPath);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to create file',
        );
      }
    },
    [sessionId, loadDirectory],
  );

  const createDirectory = useCallback(
    async (parentPath: string, name: string) => {
      const fullPath = parentPath + '/' + name;
      try {
        await apiCreateEntry(sessionId, fullPath, 'directory');
        await loadDirectory(parentPath);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to create directory',
        );
      }
    },
    [sessionId, loadDirectory],
  );

  const renameEntry = useCallback(
    async (oldPath: string, newName: string) => {
      const parent = getParentPath(oldPath);
      const newPath = parent + '/' + newName;
      try {
        await apiRenameEntry(sessionId, oldPath, newPath);
        await loadDirectory(parent);

        // If the renamed entry has an open tab, update it.
        const tab = stateRef.current.openTabs.find((t) => t.path === oldPath);
        if (tab) {
          dispatch({
            type: 'UPDATE_TAB_PATH',
            payload: { oldPath, newPath, newName },
          });
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to rename',
        );
      }
    },
    [sessionId, loadDirectory],
  );

  const deleteEntry = useCallback(
    async (path: string) => {
      const parent = getParentPath(path);
      try {
        await apiDeleteEntry(sessionId, path);
        await loadDirectory(parent);

        // Close tab if open.
        if (stateRef.current.openTabs.some((t) => t.path === path)) {
          dispatch({ type: 'CLOSE_TAB', payload: { path } });
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete',
        );
      }
    },
    [sessionId, loadDirectory],
  );

  const refreshTree = useCallback(async () => {
    try {
      // Capture currently expanded paths before fetching.
      const expandedPaths = collectExpandedPaths(stateRef.current.fileTree);

      // Fetch root.
      const rootEntries = await apiFetchTree(sessionId, '/vercel/sandbox');

      // Build the root tree (mark nodes that were expanded).
      const rootTree: FileNode[] = rootEntries.map((entry) => {
        if (
          entry.type === 'directory' &&
          expandedPaths.includes(entry.path)
        ) {
          return { ...entry, isExpanded: true };
        }
        return entry;
      });

      dispatch({ type: 'SET_FILE_TREE', payload: rootTree });

      // Recursively re-expand directories that were previously expanded.
      const reExpand = async (tree: FileNode[], paths: string[]) => {
        const expandable = paths.filter((p) =>
          tree.some((n) => n.path === p && n.type === 'directory'),
        );
        await Promise.all(
          expandable.map(async (dirPath) => {
            try {
              const children = await apiFetchTree(sessionId, dirPath);
              // Determine which children were also expanded.
              const childExpanded = paths.filter((p) =>
                children.some((c) => c.path === p),
              );
              const mergedChildren: FileNode[] = children.map((child) => {
                if (
                  child.type === 'directory' &&
                  childExpanded.includes(child.path)
                ) {
                  return { ...child, isExpanded: true };
                }
                return child;
              });

              dispatch({
                type: 'SET_NODE_CHILDREN',
                payload: { path: dirPath, children: mergedChildren },
              });

              // Recurse for expanded grandchildren.
              if (childExpanded.length > 0) {
                await reExpand(mergedChildren, paths);
              }
            } catch {
              // If a subdirectory fails, silently collapse it.
            }
          }),
        );
      };

      await reExpand(rootTree, expandedPaths);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to refresh file tree',
      );
    }
  }, [sessionId]);

  // ------------------------------------------------------------------
  // Initial load
  // ------------------------------------------------------------------

  useEffect(() => {
    const rootPath = '/vercel/sandbox';

    // Create a synthetic root so SET_NODE_CHILDREN has a target.
    // We set the file tree to contain a single root directory node, then
    // call loadDirectory to populate its children.
    dispatch({
      type: 'SET_FILE_TREE',
      payload: [
        {
          name: 'sandbox',
          path: rootPath,
          type: 'directory' as const,
          isExpanded: false,
        },
      ],
    });

    loadDirectory(rootPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ------------------------------------------------------------------
  // Memoised context value
  // ------------------------------------------------------------------

  const contextValue = useMemo<IDEContextValue>(
    () => ({
      fileTree: state.fileTree,
      openTabs: state.openTabs,
      activeTabPath: state.activeTabPath,
      loadDirectory,
      openFile,
      closeTab,
      setActiveTab,
      updateTabContent,
      saveFile,
      createFile,
      createDirectory,
      renameEntry,
      deleteEntry,
      refreshTree,
    }),
    [
      state.fileTree,
      state.openTabs,
      state.activeTabPath,
      loadDirectory,
      openFile,
      closeTab,
      setActiveTab,
      updateTabContent,
      saveFile,
      createFile,
      createDirectory,
      renameEntry,
      deleteEntry,
      refreshTree,
    ],
  );

  return (
    <IDEContext.Provider value={contextValue}>{children}</IDEContext.Provider>
  );
}
