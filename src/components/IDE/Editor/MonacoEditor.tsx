import { useRef, useCallback } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import '@vscode/codicons/dist/codicon.css';
import { useIDE } from '../IDEProvider';

/**
 * Monaco editor wrapper for the IDE. Uses Monaco's multi-model support
 * via the `path` prop to preserve cursor position and scroll state per file.
 * Handles Ctrl+S / Cmd+S for saving.
 */
export default function MonacoEditor() {
  const { openTabs, activeTabPath, updateTabContent, saveFile } = useIDE();
  const activeTabPathRef = useRef(activeTabPath);
  activeTabPathRef.current = activeTabPath;

  const activeTab = openTabs.find((t) => t.path === activeTabPath);

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      // Register Ctrl+S / Cmd+S keybinding
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        () => {
          const currentPath = activeTabPathRef.current;
          if (currentPath) {
            saveFile(currentPath);
          }
        },
      );
    },
    [saveFile],
  );

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (activeTabPath && value !== undefined) {
        updateTabContent(activeTabPath, value);
      }
    },
    [activeTabPath, updateTabContent],
  );

  if (!activeTab) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#1e1e1e] text-[#5a5a5a]">
        <span className="codicon codicon-file-code text-[64px] mb-4 opacity-40" />
        <p className="text-[14px] font-sans">
          Open a file from the explorer to start editing
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      <Editor
        path={activeTab.path}
        defaultLanguage={activeTab.language}
        defaultValue={activeTab.content}
        theme="vs-dark"
        onChange={handleChange}
        onMount={handleMount}
        options={{
          fontSize: 14,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 8 },
          tabSize: 2,
        }}
      />
    </div>
  );
}
