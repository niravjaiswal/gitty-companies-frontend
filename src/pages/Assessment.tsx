import { useState, useCallback } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import GlassNav from "@/components/GlassNav";

const mockQuestions = [
  {
    id: 1,
    title: "Implement a Rate Limiter",
    description: `## Task

Design and implement a rate limiter that restricts the number of requests a user can make within a given time window.

### Requirements

1. Support a **sliding window** algorithm
2. Handle concurrent requests safely
3. Return appropriate HTTP status codes (429 for rate-limited requests)
4. Allow configuration of:
   - Maximum requests per window
   - Window duration in seconds

### Example

\`\`\`python
limiter = RateLimiter(max_requests=100, window_seconds=60)
limiter.is_allowed("user_123")  # True
\`\`\`

### Constraints
- Time complexity: O(1) per request
- Space complexity: O(n) where n = number of unique users`,
  },
];

const Assessment = () => {
  const [currentQuestion] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const question = mockQuestions[currentQuestion];

  // Simple timer
  useState(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  });

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <div className="glass border-b border-border/50 h-14 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm text-foreground tracking-wider">TECHASSESS</span>
          <span className="w-px h-5 bg-border" />
          <span className="text-sm text-muted-foreground font-sans">Technical Assessment</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">Q</span>
            <span className="font-mono text-sm text-foreground">{currentQuestion + 1}/{mockQuestions.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-sm text-foreground">{formatTime(elapsed)}</span>
          </div>
        </div>
      </div>

      {/* Split panes */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={40} minSize={25}>
          <div className="h-full overflow-y-auto p-8">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 rounded-full glass text-xs font-mono text-primary">
                  Question {currentQuestion + 1}
                </span>
                <span className="px-3 py-1 rounded-full glass text-xs font-mono text-muted-foreground">
                  Hard
                </span>
              </div>
              <h2 className="font-mono text-2xl text-foreground mb-6">{question.title}</h2>
              <div className="prose prose-invert prose-sm max-w-none font-sans">
                {question.description.split("\n").map((line, i) => {
                  if (line.startsWith("## ")) return <h2 key={i} className="font-mono text-lg text-foreground mt-6 mb-3">{line.replace("## ", "")}</h2>;
                  if (line.startsWith("### ")) return <h3 key={i} className="font-mono text-base text-foreground mt-4 mb-2">{line.replace("### ", "")}</h3>;
                  if (line.startsWith("```")) return <div key={i} className="glass rounded-lg p-4 font-mono text-xs text-foreground my-3">{line.replace(/```\w*/, "")}</div>;
                  if (line.startsWith("- ")) return <li key={i} className="text-muted-foreground ml-4 mb-1">{line.replace("- ", "")}</li>;
                  if (line.trim() === "") return <br key={i} />;
                  return <p key={i} className="text-muted-foreground mb-2">{line}</p>;
                })}
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className="w-1 bg-border/50 hover:bg-primary/30 liquid-transition data-[resize-handle-active]:bg-primary/50"
        />

        <ResizablePanel defaultSize={60} minSize={30}>
          <div className="h-full flex items-center justify-center">
            <div className="glass rounded-2xl p-10 text-center max-w-sm">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <div className="w-3 h-3 rounded-full bg-primary" />
              </div>
              <p className="font-mono text-sm text-muted-foreground tracking-wider uppercase">
                Code Editor
              </p>
              <p className="text-xs text-muted-foreground/60 mt-2 font-sans">
                Coming soon — this space will host a live code editor
              </p>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default Assessment;
