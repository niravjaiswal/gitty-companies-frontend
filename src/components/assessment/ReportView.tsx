import { ArrowLeft, BadgeCheck, BarChart3, Clock3, Rocket, ShieldAlert, Sparkles } from "lucide-react";
import { useMemo } from "react";
import GlassCard from "@/components/GlassCard";
import LiquidButton from "@/components/LiquidButton";
import type { LocalReport } from "./localSession";

interface ReportViewProps {
  report: LocalReport;
  onRestart?: () => void;
  onBack?: () => void;
}

function ScoreRing({ value }: { value: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28">
      <circle cx="60" cy="60" r={radius} stroke="currentColor" strokeWidth="8" fill="none" className="text-border/40" />
      <circle
        cx="60"
        cy="60"
        r={radius}
        stroke="currentColor"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-primary transition-all duration-500"
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
      />
    </svg>
  );
}

/**
 * Render the session report as an editorial scorecard.
 */
export default function ReportView({ report, onRestart, onBack }: ReportViewProps) {
  const dimensions = useMemo(
    () => [
      { label: "Reasoning", value: report.reasoning },
      { label: "Correctness", value: report.correctness },
      { label: "Code quality", value: report.codeQuality },
      { label: "Vibe check", value: report.vibecheck },
      { label: "Speed", value: report.speed },
    ],
    [report],
  );

  return (
    <div className="space-y-6">
      <GlassCard hover={false} className="p-8 md:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-xs uppercase tracking-[0.25em] text-primary">
              <BadgeCheck className="h-4 w-4" />
              Submission report
            </div>
            <div>
              <p className="font-display text-xs uppercase tracking-[0.28em] text-muted-foreground">
                {report.assessmentTitle}
              </p>
              <h1 className="mt-2 font-display text-4xl text-foreground">
                {report.candidateName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                The assessment is scored on reasoning, correctness, code quality, vibe, and speed. The core signal is
                whether the candidate can use agents while still making their own judgment explicit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <ScoreRing value={report.overallScore} />
            <div>
              <p className="font-display text-5xl tabular-nums text-foreground">{report.overallScore}</p>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Overall score</p>
              <p className="mt-2 text-sm text-primary uppercase tracking-[0.18em]">{report.hiringRecommendation}</p>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <GlassCard hover={false} className="p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-muted-foreground">
            <BarChart3 className="h-4 w-4 text-primary" />
            Score breakdown
          </div>
          <div className="mt-6 space-y-4">
            {dimensions.map((dimension) => (
              <div key={dimension.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{dimension.label}</span>
                  <span className="text-muted-foreground">{dimension.value}</span>
                </div>
                <div className="h-2 rounded-full bg-border/50">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${dimension.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard hover={false} className="p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Reviewer notes
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Summary</p>
              <p className="mt-2 text-sm text-foreground">{report.summary}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Strengths</p>
              <div className="mt-2 space-y-2">
                {report.strengths.map((item) => (
                  <p key={item} className="text-sm text-muted-foreground">
                    {item}
                  </p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Risks</p>
              <div className="mt-2 space-y-2">
                {report.risks.map((item) => (
                  <p key={item} className="text-sm text-muted-foreground">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassCard hover={false} className="p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-muted-foreground">
            <Clock3 className="h-4 w-4 text-primary" />
            Session details
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <span className="text-muted-foreground">Submitted</span>
              <span className="text-foreground">{new Date(report.completedAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <span className="text-muted-foreground">Duration</span>
              <span className="text-foreground">{Math.floor(report.elapsedSeconds / 60)}m {report.elapsedSeconds % 60}s</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <span className="text-muted-foreground">Tests passed</span>
              <span className="text-foreground">{report.passedTests}/{report.totalTests}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Proctor warnings</span>
              <span className="text-foreground">{report.proctorWarnings}</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard hover={false} className="p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-muted-foreground">
            <ShieldAlert className="h-4 w-4 text-primary" />
            Evidence trail
          </div>
          <div className="mt-4 space-y-3">
            {report.evidence.map((item) => (
              <div key={item} className="rounded-xl border border-border/50 bg-secondary/20 p-4 text-sm text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {onBack && (
          <LiquidButton variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </LiquidButton>
        )}
        {onRestart && (
          <LiquidButton onClick={onRestart}>
            <Rocket className="mr-2 h-4 w-4" />
            Start another attempt
          </LiquidButton>
        )}
      </div>
    </div>
  );
}

