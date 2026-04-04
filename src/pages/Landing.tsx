import { useNavigate } from "react-router-dom";
import GlassNav from "@/components/GlassNav";
import LiquidButton from "@/components/LiquidButton";
import Tilt3D from "@/components/Tilt3D";
import { ArrowRight, BrainCircuit, GitBranch, LayoutDashboard, Sparkles, Terminal, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: BrainCircuit,
    title: "AI-generated assessments",
    description:
      "Describe the role. Gitty generates a complete brief with starter code, test files, and a grading rubric — in seconds.",
  },
  {
    icon: Terminal,
    title: "Real VS Code environment",
    description:
      "Candidates work inside a live code-server instance with a terminal, file explorer, and Monaco editor. No browser quirks.",
  },
  {
    icon: LayoutDashboard,
    title: "Signal-rich results",
    description:
      "Every keypress, command, and AI tool usage is logged. Review radar charts, timelines, and throughput graphs per candidate.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Describe the role",
    description: "Paste a prompt. Gitty builds the assessment brief, workspace files, and test suite automatically.",
  },
  {
    step: "02",
    title: "Assign by email",
    description: "Send the assessment link to any candidate. They sign in, the assignment is claimed automatically.",
  },
  {
    step: "03",
    title: "Review deep signal",
    description: "See AI tool usage, command history, code churn, and final submission — all in one results dashboard.",
  },
];

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      {/* Animated grid background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="gitty-grid-plane gitty-grid-plane-a" />
        <div className="gitty-grid-plane gitty-grid-plane-b" />
        <div className="gitty-grid-plane gitty-grid-plane-c" />
      </div>

      {/* Ambient orange radials */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(255,120,48,0.09)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-[radial-gradient(ellipse,rgba(255,120,48,0.06)_0%,transparent_70%)]" />
      </div>

      <GlassNav variant="landing" />

      <main className="relative z-10">
        {/* ── Hero ── */}
        <section className="scene-3d relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 pb-20 pt-32">

          {/* 3D decorative rings — behind hero text */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* Large outer ring */}
            <div className="ring-3d absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10"
              style={{ animationDuration: '28s' }} />
            {/* Middle ring — reverse */}
            <div className="ring-3d-reverse absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]"
              style={{ animationDuration: '20s' }} />
            {/* Inner fast ring */}
            <div className="ring-3d-fast absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/[0.14]"
              style={{ animationDuration: '12s' }} />

            {/* Orange orb top-left */}
            <div
              className="orb-3d absolute left-[12%] top-[22%] h-24 w-24 rounded-full bg-primary/10 blur-2xl"
              style={{ animationDelay: '0s', animationDuration: '9s' }}
            />
            {/* Warm orb bottom-right */}
            <div
              className="orb-3d absolute bottom-[18%] right-[10%] h-32 w-32 rounded-full bg-primary/8 blur-3xl"
              style={{ animationDelay: '3s', animationDuration: '11s' }}
            />
            {/* Tiny bright dot */}
            <div
              className="orb-3d absolute left-[68%] top-[30%] h-10 w-10 rounded-full bg-primary/30 blur-lg"
              style={{ animationDelay: '1.5s', animationDuration: '7s' }}
            />
          </div>

          <div className="depth-layer-a relative z-10 max-w-3xl text-center">
            {/* Pill badge */}
            <div className="badge-3d mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/62 backdrop-blur-sm">
              <span className="pulse-dot h-2 w-2 rounded-full bg-primary" />
              <span>Now in v1 — Single-prompt assessments</span>
              <Sparkles className="h-3.5 w-3.5 text-primary/70" />
            </div>

            <p className="mb-6 font-sans text-sm uppercase tracking-[0.3em] text-white/50">
              Hiring, Reimagined
            </p>
            <h1 className="mb-6 font-display text-5xl leading-[1.04] text-white sm:text-6xl md:text-7xl">
              The assessment
              <br />
              platform that
              <br />
              <span className="italic text-gradient-orange">feels alive</span>
            </h1>
            <p className="mx-auto mb-12 max-w-lg text-lg font-sans text-white/62">
              Create immersive technical assessments. Evaluate candidates in real-time.
              Built for teams who refuse to settle for boring.
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <LiquidButton size="lg" onClick={() => navigate("/login")}>
                I'm an Applicant
              </LiquidButton>
              <LiquidButton size="lg" variant="outline" onClick={() => navigate("/dashboard")}>
                I'm Hiring
              </LiquidButton>
              <LiquidButton size="lg" variant="ghost" onClick={() => navigate("/candidates")}>
                See Recruiter Demo
              </LiquidButton>
            </div>

            {/* Scroll nudge */}
            <div className="mt-16 flex flex-col items-center gap-2 text-white/28">
              <span className="text-xs uppercase tracking-[0.25em]">Scroll to explore</span>
              <div className="h-10 w-[1px] bg-gradient-to-b from-white/20 to-transparent" />
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="workflow" className="mx-auto max-w-7xl px-6 pb-32">
          <div className="mb-16 text-center">
            <p className="mb-4 text-xs uppercase tracking-[0.35em] text-primary/70">
              What makes Gitty different
            </p>
            <h2 className="font-display text-4xl leading-tight text-white sm:text-5xl">
              Built for depth, <span className="italic text-white/78">not checkbox hiring</span>
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <Tilt3D key={title} intensity={8} lift={8}>
                <div className="feature-card relative overflow-hidden rounded-[1.75rem] p-8">
                  {/* Inner depth highlight */}
                  <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-white/[0.06]" />
                  <div className="tilt-3d-content">
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mb-3 font-display text-2xl leading-tight text-white">{title}</h3>
                    <p className="text-sm leading-7 text-white/58">{description}</p>
                  </div>
                </div>
              </Tilt3D>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="signal" className="relative mx-auto max-w-7xl px-6 pb-32">
          <div className="mx-auto mb-20 h-[1px] max-w-4xl bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Floating ring decoration for this section */}
          <div className="pointer-events-none absolute right-0 top-0 overflow-hidden">
            <div
              className="ring-3d h-[300px] w-[300px] rounded-full border border-primary/8 opacity-60"
              style={{ animationDuration: '35s' }}
            />
          </div>

          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="depth-layer-b">
              <p className="mb-4 text-xs uppercase tracking-[0.35em] text-primary/70">
                How it works
              </p>
              <h2 className="mb-6 font-display text-4xl leading-tight text-white sm:text-5xl">
                Three steps.
                <br />
                <span className="italic text-white/78">Zero guesswork.</span>
              </h2>
              <p className="max-w-md text-base leading-8 text-white/58">
                From a blank prompt to a fully graded candidate session — Gitty handles
                the scaffolding so you can focus on the signal.
              </p>

              <div className="mt-10">
                <LiquidButton onClick={() => navigate("/dashboard")} size="lg">
                  Start hiring
                  <ArrowRight className="ml-2 h-4 w-4" />
                </LiquidButton>
              </div>
            </div>

            <div className="space-y-4">
              {HOW_IT_WORKS.map(({ step, title, description }, i) => (
                <Tilt3D key={step} intensity={5} lift={4}>
                  <div
                    className="editorial-panel flex gap-6 rounded-[1.35rem] p-6"
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    <div className="flex-shrink-0">
                      <span className="font-display text-4xl leading-none text-gradient-orange opacity-70">
                        {step}
                      </span>
                    </div>
                    <div className="tilt-3d-content">
                      <h3 className="font-display text-xl text-white">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/55">{description}</p>
                    </div>
                  </div>
                </Tilt3D>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section id="trust" className="mx-auto max-w-7xl px-6 pb-32">
          <Tilt3D intensity={4} lift={10}>
            <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-12 text-center shadow-[0_0_80px_-20px_rgba(255,120,48,0.25)]">
              {/* Inner radial glow */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-64 w-96 rounded-full bg-[radial-gradient(ellipse,rgba(255,120,48,0.14)_0%,transparent_70%)]" />
              </div>

              {/* 3D ring inside CTA */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                <div
                  className="ring-3d-reverse h-[500px] w-[500px] rounded-full border border-primary/8"
                  style={{ animationDuration: '40s' }}
                />
              </div>

              <div className="tilt-3d-content relative z-10">
                <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
                  <Zap className="h-3.5 w-3.5" />
                  <span>Free to get started</span>
                </div>
                <h2 className="mb-4 font-display text-4xl text-white sm:text-5xl">
                  Ready to upgrade your hiring signal?
                </h2>
                <p className="mx-auto mb-10 max-w-lg text-white/62">
                  Create your first AI-generated assessment in under two minutes.
                  No credit card required.
                </p>
                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <LiquidButton size="lg" onClick={() => navigate("/login")}>
                    Get started free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </LiquidButton>
                  <LiquidButton size="lg" variant="outline" onClick={() => navigate("/candidates")}>
                    <GitBranch className="mr-2 h-4 w-4" />
                    View demo
                  </LiquidButton>
                </div>
              </div>
            </div>
          </Tilt3D>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-white/[0.06] px-6 py-10 text-center">
          <p className="text-sm text-white/28">
            © {new Date().getFullYear()} Gitty. Built for teams who care about craft.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Landing;
