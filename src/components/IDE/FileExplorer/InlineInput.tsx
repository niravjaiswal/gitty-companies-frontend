import { useEffect, useRef, useState } from 'react';

interface InlineInputProps {
  defaultValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  /** Icon class to show next to the input (codicon class) */
  iconClass?: string;
  /** Depth level for proper indentation */
  depth: number;
}

/**
 * An inline text input that appears in the file tree for creating or renaming entries.
 * Auto-focuses on mount. Submits on Enter, cancels on Escape or blur.
 * Styled to match the VS Code dark theme with a blue focus border.
 */
export default function InlineInput({ defaultValue = '', onSubmit, onCancel, iconClass, depth }: InlineInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    // Auto-focus and select the text (for rename, select name without extension)
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    if (defaultValue) {
      const dotIndex = defaultValue.lastIndexOf('.');
      if (dotIndex > 0) {
        input.setSelectionRange(0, dotIndex);
      } else {
        input.select();
      }
    }
  }, [defaultValue]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed) {
        onSubmit(trimmed);
      } else {
        onCancel();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className="flex items-center h-[22px]"
      style={{ paddingLeft: depth * 16 + 4 }}
    >
      {iconClass && (
        <span className={`codicon ${iconClass} text-[14px] mr-1.5 shrink-0 opacity-70`} />
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
        className="flex-1 bg-[#3c3c3c] border border-[#007fd4] text-[#cccccc] text-[13px] px-1 py-0 h-[20px] outline-none rounded-sm font-sans"
        spellCheck={false}
      />
    </div>
  );
}
