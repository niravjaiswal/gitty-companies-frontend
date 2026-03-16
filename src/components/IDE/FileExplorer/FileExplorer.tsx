import { useCallback, useEffect, useState } from 'react';
import '@vscode/codicons/dist/codicon.css';

import { useIDE } from '../IDEProvider';
import { getFileIconClass, getFolderIconClass } from './fileIcons';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';
import InlineInput from './InlineInput';

/** Represents a node in the file tree (re-exported from IDEProvider types). */
interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

/** State for the right-click context menu. */
interface ContextMenuState {
  x: number;
  y: number;
  node: FileNode | null;
}

/** State for inline input (create or rename). */
interface InlineInputState {
  parentPath: string;
  type: 'file' | 'directory';
  mode: 'create' | 'rename';
  renamingNode?: FileNode;
}

/** The root path of the sandbox workspace. */
const ROOT_PATH = '/vercel/sandbox';

/** Interval in milliseconds between automatic tree refreshes. */
const REFRESH_INTERVAL_MS = 3000;

// ---------------------------------------------------------------------------
// TreeNode — recursive file tree row
// ---------------------------------------------------------------------------

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  activeTabPath: string | null;
  inlineInput: InlineInputState | null;
  onToggleDir: (node: FileNode) => void;
  onOpenFile: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  onInlineSubmit: (value: string) => void;
  onInlineCancel: () => void;
}

/**
 * Renders a single row in the file tree. Directories are expandable and
 * recursively render their children. Files are clickable to open in the editor.
 */
function TreeNode({
  node,
  depth,
  activeTabPath,
  inlineInput,
  onToggleDir,
  onOpenFile,
  onContextMenu,
  onInlineSubmit,
  onInlineCancel,
}: TreeNodeProps) {
  const isDir = node.type === 'directory';
  const isExpanded = !!node.isExpanded;
  const isActive = !isDir && node.path === activeTabPath;

  // Determine if this node is the one being renamed
  const isRenaming =
    inlineInput?.mode === 'rename' &&
    inlineInput.renamingNode?.path === node.path;

  // Determine if inline input for a new entry should appear inside this dir
  const showCreateInput =
    isDir &&
    isExpanded &&
    inlineInput?.mode === 'create' &&
    inlineInput.parentPath === node.path;

  const handleClick = () => {
    if (isDir) {
      onToggleDir(node);
    } else {
      onOpenFile(node.path);
    }
  };

  // If this node is being renamed, show InlineInput instead of the normal row
  if (isRenaming) {
    const iconClass = isDir
      ? getFolderIconClass(false)
      : getFileIconClass(node.name);
    return (
      <InlineInput
        depth={depth}
        defaultValue={node.name}
        iconClass={iconClass}
        onSubmit={onInlineSubmit}
        onCancel={onInlineCancel}
      />
    );
  }

  return (
    <>
      {/* The row itself */}
      <div
        className={`flex items-center h-[22px] cursor-pointer select-none hover:bg-[#2a2d2e] ${
          isActive ? 'bg-[#37373d]' : ''
        }`}
        style={{ paddingLeft: depth * 16 }}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        {/* Chevron (directories only) */}
        {isDir ? (
          <span
            className={`codicon ${
              isExpanded ? 'codicon-chevron-down' : 'codicon-chevron-right'
            } text-[14px] w-[16px] shrink-0 text-[#cccccc] ${
              node.isLoading ? 'animate-spin' : ''
            }`}
          />
        ) : (
          /* Spacer to align files with directory names */
          <span className="w-[16px] shrink-0" />
        )}

        {/* Icon */}
        <span
          className={`codicon ${
            isDir ? getFolderIconClass(isExpanded) : getFileIconClass(node.name)
          } text-[14px] mr-1.5 shrink-0 opacity-80`}
        />

        {/* Name */}
        <span className="text-[13px] text-[#cccccc] truncate font-sans">
          {node.name}
        </span>
      </div>

      {/* Children (if expanded directory) */}
      {isDir && isExpanded && (
        <>
          {/* Inline input for new file/folder at the top of children */}
          {showCreateInput && (
            <InlineInput
              depth={depth + 1}
              iconClass={
                inlineInput.type === 'file' ? 'codicon-file' : 'codicon-folder'
              }
              onSubmit={onInlineSubmit}
              onCancel={onInlineCancel}
            />
          )}

          {node.children?.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              activeTabPath={activeTabPath}
              inlineInput={inlineInput}
              onToggleDir={onToggleDir}
              onOpenFile={onOpenFile}
              onContextMenu={onContextMenu}
              onInlineSubmit={onInlineSubmit}
              onInlineCancel={onInlineCancel}
            />
          ))}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// FileExplorer — main sidebar component
// ---------------------------------------------------------------------------

/**
 * The File Explorer sidebar panel for the IDE. Displays a recursive file tree,
 * supports expanding/collapsing directories, opening files, and CRUD operations
 * (create, rename, delete) via right-click context menus and inline inputs.
 *
 * Consumes all state and actions from the IDEProvider context via `useIDE()`.
 * Auto-refreshes the tree every 3 seconds to pick up external changes.
 */
export default function FileExplorer() {
  const {
    fileTree,
    activeTabPath,
    loadDirectory,
    openFile,
    createFile,
    createDirectory,
    renameEntry,
    deleteEntry,
    refreshTree,
  } = useIDE();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [inlineInput, setInlineInput] = useState<InlineInputState | null>(null);

  // ---------------------------------------------------------------------------
  // Auto-refresh polling
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      refreshTree();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshTree]);

  // ---------------------------------------------------------------------------
  // Tree interaction handlers
  // ---------------------------------------------------------------------------

  /** Toggle a directory open/closed, loading children on first expand. */
  const handleToggleDir = useCallback(
    (node: FileNode) => {
      if (!node.isExpanded) {
        // Expanding — load children if needed
        loadDirectory(node.path);
      } else {
        // Collapsing — loadDirectory handles toggling in the store
        loadDirectory(node.path);
      }
    },
    [loadDirectory],
  );

  /** Open a file in the editor. */
  const handleOpenFile = useCallback(
    (path: string) => {
      openFile(path);
    },
    [openFile],
  );

  // ---------------------------------------------------------------------------
  // Context menu
  // ---------------------------------------------------------------------------

  /** Show context menu on a tree node. */
  const handleNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: FileNode) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, node });
    },
    [],
  );

  /** Show context menu on the explorer background (empty area). */
  const handleBackgroundContextMenu = useCallback(
    (e: React.MouseEvent) => {
      // Only trigger if the click target is the background container itself
      if (e.target === e.currentTarget) {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, node: null });
      }
    },
    [],
  );

  /** Close the context menu. */
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  /** Build context menu items based on what was right-clicked. */
  const getContextMenuItems = useCallback((): ContextMenuItem[] => {
    if (!contextMenu) return [];
    const { node } = contextMenu;

    if (!node) {
      // Right-clicked on empty background
      return [
        {
          label: 'New File...',
          onClick: () =>
            setInlineInput({ parentPath: ROOT_PATH, type: 'file', mode: 'create' }),
        },
        {
          label: 'New Folder...',
          onClick: () =>
            setInlineInput({ parentPath: ROOT_PATH, type: 'directory', mode: 'create' }),
        },
        {
          label: 'Refresh',
          separator: true,
          onClick: () => refreshTree(),
        },
      ];
    }

    if (node.type === 'directory') {
      return [
        {
          label: 'New File...',
          onClick: () => {
            // Expand directory first so the inline input is visible
            if (!node.isExpanded) {
              loadDirectory(node.path);
            }
            setInlineInput({ parentPath: node.path, type: 'file', mode: 'create' });
          },
        },
        {
          label: 'New Folder...',
          onClick: () => {
            if (!node.isExpanded) {
              loadDirectory(node.path);
            }
            setInlineInput({ parentPath: node.path, type: 'directory', mode: 'create' });
          },
        },
        {
          label: 'Rename',
          onClick: () =>
            setInlineInput({
              parentPath: node.path.substring(0, node.path.lastIndexOf('/')),
              type: node.type,
              mode: 'rename',
              renamingNode: node,
            }),
        },
        {
          label: 'Delete',
          separator: true,
          onClick: () => deleteEntry(node.path),
        },
      ];
    }

    // File node
    return [
      {
        label: 'Rename',
        onClick: () =>
          setInlineInput({
            parentPath: node.path.substring(0, node.path.lastIndexOf('/')),
            type: node.type,
            mode: 'rename',
            renamingNode: node,
          }),
      },
      {
        label: 'Delete',
        separator: true,
        onClick: () => deleteEntry(node.path),
      },
    ];
  }, [contextMenu, loadDirectory, deleteEntry, refreshTree]);

  // ---------------------------------------------------------------------------
  // Inline input handlers
  // ---------------------------------------------------------------------------

  /** Handle submission of the inline input (create or rename). */
  const handleInlineSubmit = useCallback(
    async (value: string) => {
      if (!inlineInput) return;

      if (inlineInput.mode === 'create') {
        if (inlineInput.type === 'file') {
          await createFile(inlineInput.parentPath, value);
        } else {
          await createDirectory(inlineInput.parentPath, value);
        }
      } else if (inlineInput.mode === 'rename' && inlineInput.renamingNode) {
        await renameEntry(inlineInput.renamingNode.path, value);
      }

      setInlineInput(null);
    },
    [inlineInput, createFile, createDirectory, renameEntry],
  );

  /** Cancel the inline input. */
  const handleInlineCancel = useCallback(() => {
    setInlineInput(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Header actions
  // ---------------------------------------------------------------------------

  /** Trigger a manual tree refresh. */
  const handleRefresh = useCallback(() => {
    refreshTree();
  }, [refreshTree]);

  // Check whether the inline create input should appear at the root level
  const showRootCreateInput =
    inlineInput?.mode === 'create' && inlineInput.parentPath === ROOT_PATH;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full bg-[#252526] select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[35px] shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#bbbbbb]">
          Explorer
        </span>
        <button
          className="codicon codicon-refresh text-[14px] text-[#bbbbbb] hover:text-white p-0.5 rounded hover:bg-[#2a2d2e]"
          onClick={handleRefresh}
          title="Refresh Explorer"
        />
      </div>

      {/* Tree area */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden py-1 scrollbar-thin"
        onContextMenu={handleBackgroundContextMenu}
        style={{
          scrollbarWidth: 'none',
        }}
      >
        {/* Root-level inline create input */}
        {showRootCreateInput && (
          <InlineInput
            depth={0}
            iconClass={
              inlineInput!.type === 'file' ? 'codicon-file' : 'codicon-folder'
            }
            onSubmit={handleInlineSubmit}
            onCancel={handleInlineCancel}
          />
        )}

        {fileTree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            activeTabPath={activeTabPath}
            inlineInput={inlineInput}
            onToggleDir={handleToggleDir}
            onOpenFile={handleOpenFile}
            onContextMenu={handleNodeContextMenu}
            onInlineSubmit={handleInlineSubmit}
            onInlineCancel={handleInlineCancel}
          />
        ))}
      </div>

      {/* Context menu (portal-like, rendered at fixed position) */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
