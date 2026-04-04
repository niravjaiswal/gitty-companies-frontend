import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Github,
  Linkedin,
  MailCheck,
  MapPin,
  MessageSquareQuote,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import GlassNav from "@/components/GlassNav";
import LiquidButton from "@/components/LiquidButton";
import { cn } from "@/lib/utils";

type Candidate = {
  name: string;
  title: string;
  location: string;
  score: number;
  matchReason: string;
  experience: string;
  availability: string;
  repoHighlights: string[];
  linkedinHighlights: string[];
  github: string;
  linkedin: string;
  strengths: string[];
  oaScore?: string;
  interview?: string;
};

type Message = {
  id: string;
  role: "agent" | "user";
  title?: string;
  body: string;
  loading?: boolean;
};

type Phase = "brief" | "skill" | "approval" | "done";

type StageStatus = "pending" | "active" | "complete";

const discoveredCandidates: Candidate[] = [
  {
    name: "Maya Chen",
    title: "Senior Frontend Engineer at Linear",
    location: "San Francisco, CA",
    score: 96,
    matchReason: "Strongest mix of design-system depth, product shipping, and repo maturity.",
    experience: "8+ years",
    availability: "Open to recruiter outreach this week",
    repoHighlights: [
      "Built typed component primitives with visual regression coverage",
      "Consistent React Query and state modeling patterns",
      "Performance cleanup PRs cutting interaction latency",
    ],
    linkedinHighlights: [
      "Led redesign across core product surfaces",
      "Managed collaboration with product design and infra",
      "History of mentoring frontend engineers",
    ],
    github: "12 years React/TypeScript, design systems, performance budgets",
    linkedin: "Led product surface redesign used by 40k+ weekly teams",
    strengths: ["React architecture", "Design systems", "Perf profiling"],
    oaScore: "96/100",
    interview: "Tue, Apr 1 at 1:30 PM with Priya Shah",
  },
  {
    name: "Jordan Alvarez",
    title: "Frontend Platform Engineer at Vercel",
    location: "New York, NY",
    score: 92,
    matchReason: "Best platform candidate for reusable UI foundations and testing rigor.",
    experience: "7+ years",
    availability: "Responds well to architecture-forward outreach",
    repoHighlights: [
      "Maintains OSS packages with solid release cadence",
      "High test coverage across component behavior",
      "Strong documentation and examples for developer UX",
    ],
    linkedinHighlights: [
      "Built platform primitives used across multiple teams",
      "Strong accessibility and QA ownership",
      "Experience partnering with product engineering orgs",
    ],
    github: "OSS maintainer across component libraries and testing infra",
    linkedin: "Built internal UI foundations for multi-team product org",
    strengths: ["Next.js", "Testing infra", "Accessibility"],
    oaScore: "91/100",
    interview: "Tue, Apr 1 at 3:00 PM with Daniel Kim",
  },
  {
    name: "Amina Hassan",
    title: "Product Engineer at Stripe",
    location: "Seattle, WA",
    score: 89,
    matchReason: "Strongest product-engineering blend with clean TypeScript judgment.",
    experience: "6+ years",
    availability: "Likely interested if role emphasizes user-facing ownership",
    repoHighlights: [
      "Type-safe workflow repos with disciplined CI gates",
      "Clear API boundary decisions in frontend code",
      "Strong bug-fix history around edge-case flows",
    ],
    linkedinHighlights: [
      "Shipped revenue-adjacent flows with measurable business impact",
      "Works well across PM, design, and operations",
      "Good signal on cross-functional execution",
    ],
    github: "Strong TypeScript repos with polished DX and CI hygiene",
    linkedin: "Shipped customer-facing fintech flows with measurable lift",
    strengths: ["Product sense", "Type safety", "Complex workflows"],
    oaScore: "88/100",
    interview: "Wed, Apr 2 at 10:00 AM with Elena Torres",
  },
  {
    name: "Noah Patel",
    title: "Frontend Engineer at Ramp",
    location: "Austin, TX",
    score: 81,
    matchReason: "Good execution candidate, lower systems signal than top three.",
    experience: "5+ years",
    availability: "Worth keeping warm as backup",
    repoHighlights: [
      "Shipped polished UI under fast iteration cycles",
      "Decent component organization and code hygiene",
      "Less evidence of platform or systems leadership",
    ],
    linkedinHighlights: [
      "Strong startup shipping cadence",
      "Evidence of broad product ownership",
      "Lower design-system and architecture depth",
    ],
    github: "Solid front-end repos, lighter systems design depth",
    linkedin: "Strong execution history in startup velocity environments",
    strengths: ["Execution speed", "UI polish", "Ownership"],
    oaScore: "76/100",
  },
];

const CandidatesPage = () => {
  const [phase, setPhase] = useState<Phase>("brief");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "agent-1",
      role: "agent",
      title: "Recruiter Agent",
      body:
        "I can run the full recruiting pipeline for Gitty. Tell me what to launch and I’ll inspect the company repo, map the role, source candidates, run OAs, and schedule the next round.",
    },
  ]);
  const [stageIndex, setStageIndex] = useState(0);
  const [typedSkill, setTypedSkill] = useState("");
  const [showCandidates, setShowCandidates] = useState(false);
  const [showOA, setShowOA] = useState(false);
  const [showInterview, setShowInterview] = useState(false);
  const [processing, setProcessing] = useState(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const appendMessage = (message: Message) => {
    setMessages((current) => [...current, message]);
  };

  const addLoadingMessage = (title: string, body: string) => {
    const id = `loading-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    appendMessage({
      id,
      role: "agent",
      title,
      body,
      loading: true,
    });
    return id;
  };

  const replaceLoadingMessage = (id: string, message: Message) => {
    setMessages((current) => current.map((item) => (item.id === id ? message : item)));
  };

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, showCandidates, showOA, showInterview]);

  useEffect(() => {
    if (phase !== "skill") {
      return;
    }

    const timer = window.setTimeout(() => setStageIndex(1), 450);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (!processing) {
      return;
    }

    let cancelled = false;

    const runSequence = async () => {
      const wait = (ms: number) =>
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, ms);
        });

      if (phase === "brief") {
        setStageIndex(0);
        const loadingId = addLoadingMessage(
          "Recruiter Agent",
          "Releasing recruiter agent, attaching to Gitty workspace, and scanning the company repo..."
        );
        await wait(1000);
        if (cancelled) return;
        setStageIndex(1);
        replaceLoadingMessage(loadingId, {
          id: `agent-${Date.now()}`,
          role: "agent",
          title: "Repo Analyst",
          body:
            "Recruiter agent released. I’m reviewing the Gitty repo, recent commits, open frontend issues, and product surfaces now. What skill set should I optimize the search around?",
        });
        setPhase("skill");
        setProcessing(false);
        return;
      }

      if (phase === "skill") {
        const loadingId = addLoadingMessage(
          "Sourcing Agent",
          "Mapping frontend-engineer requirements to Gitty repo context and searching GitHub plus LinkedIn..."
        );
        await wait(900);
        if (cancelled) return;
        setStageIndex(2);
        await wait(1100);
        if (cancelled) return;
        setShowCandidates(true);
        replaceLoadingMessage(loadingId, {
          id: `agent-${Date.now()}`,
          role: "agent",
          title: "Sourcing Agent",
          body:
            "I searched GitHub and LinkedIn for engineers with strong React, TypeScript, systems, and shipping velocity. I ranked the top matches below. Can I launch an OA for these candidates?",
        });
        setPhase("approval");
        setProcessing(false);
        return;
      }

      if (phase === "approval") {
        setStageIndex(3);
        const oaLoadingId = addLoadingMessage(
          "Assessment Agent",
          "Sending OA links, monitoring submissions, and scoring candidates against the frontend rubric..."
        );
        await wait(1000);
        if (cancelled) return;
        setShowOA(true);
        replaceLoadingMessage(oaLoadingId, {
          id: `agent-${Date.now()}`,
          role: "agent",
          title: "Assessment Agent",
          body:
            "OA sent. I evaluated submissions, ranked the top three, and filtered out weaker performers. I’m scheduling the next round with the hiring team and sending Google Calendar invites now.",
        });
        const scheduleLoadingId = addLoadingMessage(
          "Scheduler Agent",
          "Connecting to Google Calendar, checking interviewer availability, and creating next-round invites..."
        );
        await wait(1200);
        if (cancelled) return;
        setStageIndex(4);
        setShowInterview(true);
        replaceLoadingMessage(scheduleLoadingId, {
          id: `agent-${Date.now()}`,
          role: "agent",
          title: "Scheduler Agent",
          body:
            "Done. Calendar invites are out for the top three candidates. Pipeline is now ready for recruiter review and interviewer handoff.",
        });
        setPhase("done");
        setProcessing(false);
      }
    };

    runSequence();

    return () => {
      cancelled = true;
    };
  }, [phase, processing]);

  const stageStatuses = useMemo<StageStatus[]>(
    () =>
      [0, 1, 2, 3, 4].map((index) => {
        if (index < stageIndex) return "complete";
        if (index === stageIndex) return "active";
        return "pending";
      }),
    [stageIndex]
  );

  const handleSubmit = () => {
    const input = draft.trim();
    if (!input || processing) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: `user-${current.length + 1}`,
        role: "user",
        body: input,
      },
    ]);
    setDraft("");

    if (phase === "brief") {
      setProcessing(true);
      return;
    }

    if (phase === "skill") {
      setTypedSkill(input);
      setProcessing(true);
      return;
    }

    if (phase === "approval") {
      setProcessing(true);
    }
  };

  const topCandidates = discoveredCandidates.slice(0, 3);
  const connectors = [
    {
      name: "GitHub",
      icon: <Github className="h-4 w-4" />,
      status: "connected",
      detail: "Repo graph, contribution history, OSS quality signal",
    },
    {
      name: "LinkedIn",
      icon: <Linkedin className="h-4 w-4" />,
      status: "connected",
      detail: "Role history, tenure, network and title validation",
    },
    {
      name: "OA Engine",
      icon: <FileCheck2 className="h-4 w-4" />,
      status: showOA || showInterview ? "active" : "ready",
      detail: "Assessment dispatch, scoring, and top-k ranking",
    },
    {
      name: "Google Calendar",
      icon: <CalendarDays className="h-4 w-4" />,
      status: showInterview ? "allowed" : "awaiting",
      detail: showInterview
        ? "Permission granted. Invites sent to interviewers and finalists."
        : "OAuth approval required before scheduling next round.",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="gitty-grid-plane gitty-grid-plane-a" />
        <div className="gitty-grid-plane gitty-grid-plane-b" />
        <div className="gitty-grid-plane gitty-grid-plane-c" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,123,61,0.18),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(255,220,170,0.12),transparent_18%)]" />
      </div>

      <GlassNav variant="landing" />

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-8 pt-28">
        <section className="items-start grid gap-6 xl:grid-cols-[1.2fr_0.45fr]">
          <div className="editorial-panel flex max-h-[calc(100vh-9rem)] min-h-[620px] flex-col overflow-hidden rounded-[2rem]">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  <Bot className="h-5 w-5 text-[#ff9b66]" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-white/40">Agent Console</p>
                  <p className="text-lg text-white/90">Recruiter orchestration chat</p>
                </div>
              </div>
              <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-200">
                autonomous
              </div>
            </div>

            <div
              ref={transcriptRef}
              className="gitty-terminal-body min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
            >
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={cn(
                    "max-w-[42rem] rounded-[1.35rem] border px-4 py-3.5",
                    message.role === "agent"
                      ? "border-white/8 bg-white/[0.035]"
                      : "ml-auto border-[#ff7b3d]/20 bg-[#ff7b3d]/10"
                  )}
                >
                  <div className="mb-2.5 flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-xl border",
                        message.role === "agent"
                          ? "border-white/10 bg-black/30 text-[#ff9b66]"
                          : "border-[#ff7b3d]/25 bg-[#ff7b3d]/12 text-[#ffd1ba]"
                      )}
                    >
                      {message.role === "agent" ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-white/90">
                        {message.title ?? "Hiring Manager"}
                      </p>
                      <p className="text-xs uppercase tracking-[0.24em] text-white/35">
                        {message.role === "agent" ? "agent output" : "user prompt"}
                      </p>
                    </div>
                  </div>
                  <p className="max-w-[38rem] text-[14px] leading-6 text-white/72">{message.body}</p>
                  {message.loading && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/45">
                      <span className="flex gap-1">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff9b66]" />
                        <span
                          className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff9b66]"
                          style={{ animationDelay: "160ms" }}
                        />
                        <span
                          className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff9b66]"
                          style={{ animationDelay: "320ms" }}
                        />
                      </span>
                      processing
                    </div>
                  )}
                </article>
              ))}

              {showCandidates && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">
                      Recommended Candidates
                    </p>
                    <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                      {typedSkill || "Frontend engineer"}
                    </div>
                  </div>
                  {discoveredCandidates.map((candidate) => (
                    <CandidateCard key={candidate.name} candidate={candidate} />
                  ))}
                </div>
              )}

              {showOA && (
                <section className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-emerald-400/10 text-emerald-300">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-[0.28em] text-white/40">OA Results</p>
                      <p className="text-lg text-white/90">Top candidates after autonomous scoring</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {topCandidates.map((candidate, index) => (
                      <div
                        key={candidate.name}
                        className="flex flex-col gap-3 rounded-[1.25rem] border border-white/8 bg-black/25 px-4 py-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="text-base text-white">{index + 1}. {candidate.name}</p>
                          <p className="text-sm text-white/55">{candidate.title}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/58">
                            OA {candidate.oaScore}
                          </div>
                          <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-emerald-200">
                            advanced
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {showInterview && (
                <section className="rounded-[1.5rem] border border-[#ff7b3d]/18 bg-[#ff7b3d]/[0.06] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#ff7b3d]/20 bg-[#ff7b3d]/12 text-[#ffb084]">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-[0.28em] text-white/40">Next Round Scheduled</p>
                      <p className="text-lg text-white/90">Google Calendar invites sent automatically</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {topCandidates.map((candidate) => (
                      <div
                        key={candidate.name}
                        className="rounded-[1.25rem] border border-white/8 bg-black/20 px-4 py-4"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-base text-white">{candidate.name}</p>
                            <p className="text-sm text-white/55">{candidate.interview}</p>
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/60">
                            <MailCheck className="h-3.5 w-3.5" />
                            gcal invite delivered
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="border-t border-white/8 p-4">
              <div className="flex flex-col gap-3 rounded-[1.35rem] border border-white/10 bg-black/30 p-3 md:flex-row md:items-center">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder={
                    phase === "brief"
                      ? "Type: I want you to release the recruiter agent for Gitty"
                      : phase === "skill"
                        ? "Type: frontend engineer"
                        : phase === "approval"
                          ? "Type: go ahead"
                          : "Pipeline complete"
                  }
                  disabled={phase === "done"}
                  className="h-12 flex-1 bg-transparent px-4 text-[15px] text-white outline-none placeholder:text-white/30"
                />
                <LiquidButton
                  onClick={handleSubmit}
                  disabled={processing || phase === "done"}
                  className="min-w-[160px]"
                >
                  {processing ? "Running..." : "Send Prompt"}
                </LiquidButton>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="editorial-panel rounded-[2rem] p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Connected Systems</p>
              <div className="mt-5 space-y-3">
                {connectors.map((connector) => (
                  <ConnectorRow key={connector.name} {...connector} />
                ))}
              </div>
            </div>

            <div className="editorial-panel rounded-[2rem] p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Pipeline Graph</p>
              <div className="mt-5 space-y-4">
                <StageRow
                  icon={<Search className="h-4 w-4" />}
                  title="Repo Analysis"
                  body="Inspect Gitty repo, issues, and shipped frontend patterns."
                  status={stageStatuses[0]}
                />
                <StageRow
                  icon={<Briefcase className="h-4 w-4" />}
                  title="Role Intake"
                  body="Collect target skill signal from hiring manager."
                  status={stageStatuses[1]}
                />
                <StageRow
                  icon={<Github className="h-4 w-4" />}
                  title="Source Candidates"
                  body="Search GitHub and LinkedIn for aligned engineers."
                  status={stageStatuses[2]}
                />
                <StageRow
                  icon={<ShieldCheck className="h-4 w-4" />}
                  title="Run OA"
                  body="Dispatch OA and score submissions autonomously."
                  status={stageStatuses[3]}
                />
                <StageRow
                  icon={<CalendarDays className="h-4 w-4" />}
                  title="Schedule Round"
                  body="Select top K and send Google Calendar invites."
                  status={stageStatuses[4]}
                />
              </div>
            </div>

            <div className="editorial-panel rounded-[2rem] p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Run Summary</p>
              <div className="mt-5 grid gap-3">
                <SummaryRow
                  icon={<Search className="h-4 w-4" />}
                  label="Autonomous actions"
                  value="Repo review, sourcing, OA, ranking, scheduling"
                />
                <SummaryRow
                  icon={<Clock3 className="h-4 w-4" />}
                  label="Time to shortlist"
                  value="Under 1 hour simulated flow"
                />
                <SummaryRow
                  icon={<MessageSquareQuote className="h-4 w-4" />}
                  label="Human approvals"
                  value="Role skill target and OA go-ahead only"
                />
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
};

const StageRow = ({
  icon,
  title,
  body,
  status,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  status: StageStatus;
}) => (
  <div
    className={cn(
      "rounded-[1.4rem] border px-4 py-4 transition-all duration-500",
      status === "complete" && "border-emerald-400/18 bg-emerald-400/8",
      status === "active" && "border-[#ff7b3d]/25 bg-[#ff7b3d]/10 shadow-[0_0_40px_rgba(255,123,61,0.08)]",
      status === "pending" && "border-white/8 bg-black/20"
    )}
  >
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border",
          status === "complete" && "border-emerald-400/15 bg-emerald-400/10 text-emerald-200",
          status === "active" && "border-[#ff7b3d]/20 bg-[#ff7b3d]/12 text-[#ffb084]",
          status === "pending" && "border-white/10 bg-white/[0.04] text-white/55"
        )}
      >
        {status === "complete" ? <CheckCircle2 className="h-4 w-4" /> : icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-white/92">{title}</p>
          <span className="text-[10px] uppercase tracking-[0.24em] text-white/35">{status}</span>
        </div>
        <p className="mt-1 text-sm leading-6 text-white/55">{body}</p>
      </div>
    </div>
  </div>
);

const CandidateCard = ({ candidate }: { candidate: Candidate }) => (
  <article className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <p className="text-xl text-white">{candidate.name}</p>
          <div className="rounded-full border border-[#ff7b3d]/20 bg-[#ff7b3d]/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#ffbf9c]">
            Match {candidate.score}
          </div>
        </div>
        <p className="mt-1 text-sm text-white/55">{candidate.title}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-white/42">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {candidate.location}
          </span>
          <span>{candidate.experience}</span>
          <span>{candidate.availability}</span>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/68">{candidate.matchReason}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {candidate.strengths.map((strength) => (
          <span
            key={strength}
            className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/58"
          >
            {strength}
          </span>
        ))}
      </div>
    </div>

    <div className="mt-5 grid gap-3 md:grid-cols-2">
      <SourcePanel icon={<Github className="h-4 w-4" />} title="GitHub signal" body={candidate.github} />
      <SourcePanel icon={<Linkedin className="h-4 w-4" />} title="LinkedIn signal" body={candidate.linkedin} />
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <EvidencePanel title="Repo evidence" items={candidate.repoHighlights} />
      <EvidencePanel title="Career evidence" items={candidate.linkedinHighlights} />
    </div>
  </article>
);

const SourcePanel = ({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) => (
  <div className="rounded-[1.25rem] border border-white/8 bg-black/20 p-4">
    <div className="flex items-center gap-2 text-white/75">
      {icon}
      <p className="text-sm">{title}</p>
    </div>
    <p className="mt-3 text-sm leading-6 text-white/58">{body}</p>
  </div>
);

const EvidencePanel = ({ title, items }: { title: string; items: string[] }) => (
  <div className="rounded-[1.25rem] border border-white/8 bg-black/20 p-4">
    <p className="text-sm text-white/78">{title}</p>
    <div className="mt-3 space-y-2">
      {items.map((item) => (
        <div key={item} className="flex gap-2 text-sm leading-6 text-white/58">
          <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-[#ff9b66]" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  </div>
);

const ConnectorRow = ({
  name,
  icon,
  status,
  detail,
}: {
  name: string;
  icon: React.ReactNode;
  status: string;
  detail: string;
}) => (
  <div className="rounded-[1.35rem] border border-white/8 bg-black/20 px-4 py-4">
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/72">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-white/92">{name}</p>
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em]",
              status === "connected" && "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
              status === "ready" && "border-white/10 bg-white/[0.04] text-white/55",
              status === "active" && "border-[#ff7b3d]/20 bg-[#ff7b3d]/10 text-[#ffbf9c]",
              status === "allowed" && "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
              status === "awaiting" && "border-amber-300/20 bg-amber-300/10 text-amber-100"
            )}
          >
            {status}
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-white/55">{detail}</p>
      </div>
    </div>
  </div>
);

const SummaryRow = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="rounded-[1.3rem] border border-white/8 bg-black/20 px-4 py-4">
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/75">
        {icon}
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-white/38">{label}</p>
        <p className="mt-1 text-sm leading-6 text-white/75">{value}</p>
      </div>
    </div>
  </div>
);

export default CandidatesPage;
