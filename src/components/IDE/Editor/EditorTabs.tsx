import '@vscode/codicons/dist/codicon.css';
import { useIDE } from '../IDEProvider';
import { getFileIconClass } from '../FileExplorer/fileIcons';

/**
 * Tab bar for the IDE editor. Renders one tab per open file with
 * dirty indicators and close buttons. Matches VS Code dark theme styling.
 */
export default function EditorTabs() {
  const { openTabs, activeTabPath, setActiveTab, closeTab, saveFile } = useIDE();

  if (openTabs.length === 0) return null;

  const handleClose = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const tab = openTabs.find((t) => t.path === path);
    if (tab?.isDirty) {
      const save = confirm(`Do you want to save changes to ${tab.name}?`);
      if (save) {
        saveFile(path).then(() => closeTab(path));
        return;
      }
    }
    closeTab(path);
  };

  const handleMouseDown = (e: React.MouseEvent, path: string) => {
    // Middle-click closes tab
    if (e.button === 1) {
      e.preventDefault();
      handleClose(e, path);
    }
  };

  return (
    <div className="flex items-end bg-[#252526] overflow-x-auto shrink-0" style={{ height: 35 }}>
      {openTabs.map((tab) => {
        const isActive = tab.path === activeTabPath;
        return (
          <div
            key={tab.path}
            className={`flex items-center gap-1.5 px-3 h-[35px] cursor-pointer select-none border-r border-[#252526] shrink-0 ${
              isActive
                ? 'bg-[#1e1e1e] text-[#cccccc] border-b-2 border-b-[#007acc]'
                : 'bg-[#2d2d2d] text-[#969696] border-b-2 border-b-transparent hover:bg-[#2d2d2d]/80'
            }`}
            onClick={() => setActiveTab(tab.path)}
            onMouseDown={(e) => handleMouseDown(e, tab.path)}
          >
            <span
              className={`codicon ${getFileIconClass(tab.name)} text-[14px] shrink-0 opacity-80`}
            />
            <span className="text-[13px] whitespace-nowrap font-sans">
              {tab.name}
            </span>
            {tab.isDirty ? (
              <span
                className="text-[14px] leading-none ml-0.5 hover:bg-[#3c3c3c] rounded-sm w-[18px] h-[18px] flex items-center justify-center"
                onClick={(e) => handleClose(e, tab.path)}
                title="Unsaved changes — click to close"
              >
                ●
              </span>
            ) : (
              <button
                className="codicon codicon-close text-[14px] ml-0.5 hover:bg-[#3c3c3c] rounded-sm w-[18px] h-[18px] flex items-center justify-center opacity-0 group-hover:opacity-100"
                style={{ opacity: isActive ? 1 : undefined }}
                onClick={(e) => handleClose(e, tab.path)}
                title="Close"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
