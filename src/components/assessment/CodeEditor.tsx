import { lazy, Suspense } from "react";
import type { EditorProps, OnMount } from "@monaco-editor/react";
import { cn } from "@/lib/utils";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

export interface CodeEditorProps {
  language: string;
  value: string;
  readOnly?: boolean;
  className?: string;
  height?: EditorProps["height"];
  onChange: (value: string) => void;
  onMount?: OnMount;
}

/**
 * Lazily load Monaco so the assessment page stays responsive on first paint.
 */
export default function CodeEditor({
  language,
  value,
  readOnly = false,
  className,
  height = "100%",
  onChange,
  onMount,
}: CodeEditorProps) {
  return (
    <Suspense
      fallback={
        <div className={cn("flex h-full items-center justify-center rounded-xl border border-border/60 bg-secondary/20 text-sm text-muted-foreground", className)}>
          Loading editor...
        </div>
      }
    >
      <MonacoEditor
        className={cn("rounded-xl overflow-hidden", className)}
        height={height}
        language={language}
        value={value}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: "on",
          readOnly,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          lineNumbersMinChars: 3,
        }}
        onChange={(nextValue) => onChange(nextValue ?? "")}
        onMount={onMount}
      />
    </Suspense>
  );
}
