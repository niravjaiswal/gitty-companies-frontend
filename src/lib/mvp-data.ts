export type AssessmentStatus = "draft" | "active" | "paused" | "completed";
export type AssessmentSource = "github" | "prd" | "generated" | "manual";
export type AssessmentMode = "agent-native" | "hybrid" | "pairing";
export type AssessmentDifficulty = "easy" | "medium" | "hard" | "staff";
export type SessionStatus = "pending" | "active" | "completed" | "expired" | "abandoned";
export type CandidateStatus = "invited" | "in_progress" | "completed" | "reviewed" | "blocked";
export type ScoreDecision = "strong_yes" | "yes" | "maybe" | "no" | "strong_no";
export type RubricDimensionId =
  | "logic"
  | "agent_orchestration"
  | "judgment"
  | "testing"
  | "communication";

export interface TaskWorkspaceFile {
  path: string;
  language: string;
  description: string;
  content: string;
  locked?: boolean;
}

export interface RubricDimension {
  id: RubricDimensionId;
  label: string;
  weight: number;
  description: string;
  whatGoodLooksLike: string[];
}

export interface TaskTemplate {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  candidateBrief: string;
  problemStatement: string;
  focusAreas: string[];
  allowedTools: string[];
  evaluationSignals: string[];
  hiddenRisks: string[];
  estimatedMinutes: number;
  difficulty: AssessmentDifficulty;
  starterFiles: TaskWorkspaceFile[];
  rubric: RubricDimension[];
}

export interface AssessmentInvite {
  email: string;
  fullName: string;
  status: "sent" | "opened" | "started" | "completed";
  invitedAt: string;
  openedAt?: string;
  startedAt?: string;
  completedAt?: string;
  candidateId?: string;
  sessionId?: string;
}

export interface AssessmentRecord {
  id: string;
  slug: string;
  title: string;
  role: string;
  team: string;
  source: AssessmentSource;
  status: AssessmentStatus;
  mode: AssessmentMode;
  difficulty: AssessmentDifficulty;
  templateId: string;
  owner: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  timeLimitMinutes: number;
  candidateLimit: number;
  invitedCount: number;
  startedCount: number;
  completedCount: number;
  averageScore: number;
  passRate: number;
  tags: string[];
  rubricFocus: RubricDimensionId[];
  notes: string;
  sharePath: string;
  invites: AssessmentInvite[];
}

export interface CandidateRecord {
  id: string;
  assessmentId: string;
  sessionId?: string;
  scorecardId?: string;
  fullName: string;
  email: string;
  headline: string;
  company: string;
  title: string;
  location: string;
  status: CandidateStatus;
  experienceYears: number;
  invitedAt: string;
  startedAt?: string;
  completedAt?: string;
  lastSeenAt?: string;
  agentToolPreference: string[];
  summary: string;
  strengths: string[];
  risks: string[];
}

export interface SessionEvent {
  at: string;
  label: string;
  detail: string;
}

export interface AssessmentSessionRecord {
  id: string;
  assessmentId: string;
  candidateId: string;
  status: SessionStatus;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  expiresAt: string;
  timeLimitMinutes: number;
  currentQuestionIndex: number;
  codeServerUrl: string;
  workspaceLabel: string;
  stopReason?: "submitted" | "timed_out" | "abandoned" | "rejected";
  heartbeatAt?: string;
  events: SessionEvent[];
}

export interface ScorecardDimensionScore {
  dimensionId: RubricDimensionId;
  label: string;
  score: number;
  maxScore: number;
  evidence: string[];
}

export interface ScorecardRecord {
  id: string;
  assessmentId: string;
  sessionId: string;
  candidateId: string;
  reviewer: string;
  reviewedAt: string;
  decision: ScoreDecision;
  totalScore: number;
  maxScore: number;
  band: string;
  summary: string;
  strengths: string[];
  risks: string[];
  nextStep: string;
  evidence: string[];
  dimensions: ScorecardDimensionScore[];
}

export interface AssessmentSourceOption {
  source: AssessmentSource;
  label: string;
  description: string;
  suggestedTemplateId: string;
  defaultTitle: string;
  defaultRole: string;
  defaultDifficulty: AssessmentDifficulty;
  defaultTimeLimitMinutes: number;
  evaluationPromise: string;
}

export interface AssessmentSummaryStats {
  activeAssessments: number;
  draftAssessments: number;
  completedAssessments: number;
  totalCandidates: number;
  sessionsRunning: number;
  needsReview: number;
  averageScore: number;
  passRate: number;
}

export interface DashboardAssessmentCard {
  id: string;
  title: string;
  role: string;
  status: AssessmentStatus;
  statusLabel: string;
  source: AssessmentSource;
  difficulty: AssessmentDifficulty;
  candidateCount: number;
  completedCount: number;
  averageScore: number;
  passRate: number;
  createdAt: string;
  updatedAt: string;
  createdLabel: string;
  updatedLabel: string;
  templateTitle: string;
  tags: string[];
  needsReview: boolean;
}

export interface CreateAssessmentDefaults {
  source: AssessmentSource;
  title: string;
  role: string;
  difficulty: AssessmentDifficulty;
  timeLimitMinutes: number;
  templateId: string;
  prompt: string;
  focusAreas: string[];
  notes: string;
}

export interface SendAssessmentModel {
  assessment: AssessmentRecord;
  template: TaskTemplate;
  shareUrl: string;
  copySubject: string;
  copyBody: string;
  inviteSummary: {
    total: number;
    sent: number;
    opened: number;
    started: number;
    completed: number;
  };
  invites: AssessmentInvite[];
  recentCandidates: CandidateRecord[];
}

export interface CandidateDashboardModel {
  candidate: CandidateRecord;
  assessment: AssessmentRecord;
  template: TaskTemplate;
  session?: AssessmentSessionRecord;
  scorecard?: ScorecardRecord;
  headline: string;
  primaryAction: string;
  secondaryAction: string;
  statusLabel: string;
  timeline: SessionEvent[];
  evaluationFocus: string[];
}

export interface SessionWorkspaceModel {
  session: AssessmentSessionRecord;
  assessment: AssessmentRecord;
  candidate: CandidateRecord;
  template: TaskTemplate;
  scorecard?: ScorecardRecord;
  progressLabel: string;
  timeLimitMinutes: number;
  workspaceFiles: TaskWorkspaceFile[];
  rubric: RubricDimension[];
  allowedTools: string[];
  evaluationSignals: string[];
}

const seedNow = Date.parse("2026-03-23T12:00:00.000Z");

function daysAgo(days: number): string {
  return new Date(seedNow - days * 24 * 60 * 60 * 1000).toISOString();
}

function hoursAgo(hours: number): string {
  return new Date(seedNow - hours * 60 * 60 * 1000).toISOString();
}

function daysFromNow(days: number): string {
  return new Date(seedNow + days * 24 * 60 * 60 * 1000).toISOString();
}

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  const absMinutes = Math.abs(Math.round(diffMs / 60000));
  const absHours = Math.abs(Math.round(diffMs / 3600000));
  const absDays = Math.abs(Math.round(diffMs / 86400000));

  if (absMinutes < 60) {
    return diffMs >= 0 ? `${absMinutes}m ago` : `in ${absMinutes}m`;
  }

  if (absHours < 48) {
    return diffMs >= 0 ? `${absHours}h ago` : `in ${absHours}h`;
  }

  return diffMs >= 0 ? `${absDays}d ago` : `in ${absDays}d`;
}

const taskTemplates: TaskTemplate[] = [
  {
    id: "agent-support-triage",
    slug: "support-triage-orchestrator",
    title: "Support Triage Orchestrator",
    subtitle: "Agent-native customer support workflow",
    summary:
      "Design a workflow where multiple agents classify, research, draft, and escalate support requests without losing human judgment.",
    candidateBrief:
      "You may use any coding assistants or internal agents you want. We care about how well you structure the work, verify outputs, and choose escalation points.",
    problemStatement:
      "Build the core logic for an incoming support queue that routes simple issues to an automated responder, sends ambiguous issues to a research agent, and flags risky cases for human review.",
    focusAreas: ["agent orchestration", "classification", "fallback logic", "human-in-the-loop"],
    allowedTools: ["LLM agents", "terminal", "tests", "document retrieval", "http client"],
    evaluationSignals: [
      "clear task decomposition",
      "safe escalation thresholds",
      "observable reasoning",
      "useful validation and retries",
    ],
    hiddenRisks: [
      "confidence without evidence",
      "over-automation on sensitive cases",
      "missing regression tests",
    ],
    estimatedMinutes: 75,
    difficulty: "medium",
    starterFiles: [
      {
        path: "/app/src/queue/router.ts",
        language: "typescript",
        description: "Main routing entry point for support requests.",
        content:
          "export function routeTicket(ticket) {\n  // TODO: classify, research, respond, or escalate\n}\n",
      },
      {
        path: "/app/src/queue/policies.ts",
        language: "typescript",
        description: "Policy thresholds for confidence and escalation.",
        content:
          "export const TRIAGE_POLICIES = {\n  autoResolveMinConfidence: 0.92,\n  escalateOnComplianceRisk: true,\n};\n",
      },
      {
        path: "/app/tests/router.test.ts",
        language: "typescript",
        description: "A few guardrail tests to extend.",
        content: "describe('routeTicket', () => {\n  it('routes ambiguous cases to human review', () => {});\n});\n",
      },
    ],
    rubric: [
      {
        id: "agent_orchestration",
        label: "Orchestration",
        weight: 30,
        description: "How well the candidate sequences agents and tools.",
        whatGoodLooksLike: [
          "chooses the right agent for the right job",
          "captures intermediate outputs",
          "handles retry and fallback paths",
        ],
      },
      {
        id: "logic",
        label: "Logic",
        weight: 25,
        description: "Core correctness and problem decomposition.",
        whatGoodLooksLike: [
          "captures edge cases explicitly",
          "uses deterministic checks where possible",
          "keeps branching understandable",
        ],
      },
      {
        id: "judgment",
        label: "Judgment",
        weight: 25,
        description: "Risk awareness and tradeoff quality.",
        whatGoodLooksLike: [
          "knows when to stop an agent from acting",
          "avoids false confidence",
          "escalates clearly when data is missing",
        ],
      },
      {
        id: "testing",
        label: "Testing",
        weight: 10,
        description: "Evidence that the workflow stays stable over time.",
        whatGoodLooksLike: [
          "covers failure paths",
          "tests routing thresholds",
          "checks deterministic outputs",
        ],
      },
      {
        id: "communication",
        label: "Communication",
        weight: 10,
        description: "How clearly the solution is explained to a reviewer.",
        whatGoodLooksLike: [
          "summarizes intent in plain language",
          "documents assumptions",
          "shows why the approach is safe",
        ],
      },
    ],
  },
  {
    id: "agent-incident-response",
    slug: "incident-response-coordinator",
    title: "Incident Response Coordinator",
    subtitle: "Recover from failures with an agent runbook",
    summary:
      "Evaluate whether the candidate can coordinate agents during an outage, preserve signal, and keep humans in the loop.",
    candidateBrief:
      "This task rewards calm decision-making. Use agents to gather context, but prove you can reason about blast radius and safe rollback.",
    problemStatement:
      "Implement an incident workflow that ingests alerts, deduplicates noise, gathers evidence from logs, and drafts a concise incident summary with an action plan.",
    focusAreas: ["incident triage", "rollback logic", "evidence collection", "judgment"],
    allowedTools: ["LLM agents", "logs", "shell", "tests", "web search"],
    evaluationSignals: [
      "good signal extraction",
      "resists noisy alerts",
      "clear rollback plan",
      "fast but safe decisions",
    ],
    hiddenRisks: [
      "treating every alert as equal",
      "missing customer impact",
      "poor incident handoff notes",
    ],
    estimatedMinutes: 90,
    difficulty: "hard",
    starterFiles: [
      {
        path: "/app/src/incidents/normalize.ts",
        language: "typescript",
        description: "Turn alerts into a canonical incident shape.",
        content:
          "export function normalizeAlert(alert) {\n  return {\n    severity: alert.severity,\n    service: alert.service,\n  };\n}\n",
      },
      {
        path: "/app/src/incidents/summarize.ts",
        language: "typescript",
        description: "Draft the incident summary passed to humans.",
        content:
          "export function summarizeIncident(incident) {\n  // TODO: include impact, scope, root cause, and next step\n}\n",
      },
      {
        path: "/app/tests/incidents.test.ts",
        language: "typescript",
        description: "Regression tests for the response workflow.",
        content: "describe('incident workflow', () => {\n  it('deduplicates repeated alerts', () => {});\n});\n",
      },
    ],
    rubric: [
      {
        id: "logic",
        label: "Logic",
        weight: 25,
        description: "Whether the workflow is correct under pressure.",
        whatGoodLooksLike: ["keeps alert handling deterministic", "models severity correctly", "avoids circular retries"],
      },
      {
        id: "agent_orchestration",
        label: "Orchestration",
        weight: 25,
        description: "How well the candidate coordinates evidence gathering.",
        whatGoodLooksLike: ["uses the right agent per evidence source", "merges outputs cleanly", "keeps context small"],
      },
      {
        id: "judgment",
        label: "Judgment",
        weight: 30,
        description: "Whether the candidate protects users and the business.",
        whatGoodLooksLike: ["escalates risky incidents quickly", "avoids overconfident blame", "calls out uncertainty"],
      },
      {
        id: "testing",
        label: "Testing",
        weight: 10,
        description: "Coverage around noisy input and missing data.",
        whatGoodLooksLike: ["tests duplicates", "tests empty evidence", "tests severity thresholds"],
      },
      {
        id: "communication",
        label: "Communication",
        weight: 10,
        description: "The quality of the final incident note.",
        whatGoodLooksLike: ["clear impact statement", "plain-language action plan", "easy to hand off"],
      },
    ],
  },
  {
    id: "agent-data-reconciliation",
    slug: "data-reconciliation-specialist",
    title: "Data Reconciliation Specialist",
    subtitle: "Multi-source consistency with agent assistance",
    summary:
      "A practical task for candidates who can use agents to compare datasets, resolve conflicts, and explain final decisions.",
    candidateBrief:
      "You can lean on agents for analysis, but the final reconciliation logic must be explicit, testable, and defensible.",
    problemStatement:
      "Given multiple conflicting customer records, create a reconciliation engine that deduplicates profiles, chooses canonical values, and explains any ambiguous merges.",
    focusAreas: ["deduplication", "merge strategy", "explanation quality", "tradeoff handling"],
    allowedTools: ["LLM agents", "csv parsing", "terminal", "tests"],
    evaluationSignals: ["clear precedence rules", "strong edge-case handling", "transparent explanations", "maintainable model"],
    hiddenRisks: ["silent bad merges", "weak tie-breaking rules", "opaque merge decisions"],
    estimatedMinutes: 60,
    difficulty: "medium",
    starterFiles: [
      {
        path: "/app/src/reconcile/merge.ts",
        language: "typescript",
        description: "Canonical record selection logic.",
        content: "export function pickCanonicalRecord(records) {\n  // TODO: choose the best record and explain why\n}\n",
      },
      {
        path: "/app/src/reconcile/explain.ts",
        language: "typescript",
        description: "User-facing merge explanation builder.",
        content: "export function buildMergeExplanation(decision) {\n  return decision;\n}\n",
      },
    ],
    rubric: [
      {
        id: "logic",
        label: "Logic",
        weight: 35,
        description: "Whether the merge rules are consistent and correct.",
        whatGoodLooksLike: ["ties are resolved consistently", "bad inputs do not corrupt output", "rules are easy to follow"],
      },
      {
        id: "agent_orchestration",
        label: "Orchestration",
        weight: 20,
        description: "How well the candidate uses agents to compare source data.",
        whatGoodLooksLike: ["delegates comparisons cleanly", "avoids duplicate work", "uses tools for validation"],
      },
      {
        id: "judgment",
        label: "Judgment",
        weight: 20,
        description: "Tradeoffs around merges and ambiguity.",
        whatGoodLooksLike: ["calls out ambiguity clearly", "preserves confidence levels", "knows when not to merge"],
      },
      {
        id: "testing",
        label: "Testing",
        weight: 15,
        description: "Guardrails against data loss and regressions.",
        whatGoodLooksLike: ["covers duplicate keys", "covers conflict cases", "covers empty source files"],
      },
      {
        id: "communication",
        label: "Communication",
        weight: 10,
        description: "The final reasoning around the merge decision.",
        whatGoodLooksLike: ["shows why the canonical value won", "explains uncertainty", "keeps it readable"],
      },
    ],
  },
  {
    id: "agent-product-planner",
    slug: "agent-product-planner",
    title: "Agent Product Planner",
    subtitle: "Prompting, planning, and tradeoffs for a shipped feature",
    summary:
      "A hybrid build/design exercise for candidates who can turn a loose product idea into a bounded, testable agent workflow.",
    candidateBrief:
      "We are not grading the number of tools you use. We are grading your ability to define the problem, set boundaries, and make the output shippable.",
    problemStatement:
      "Turn a vague product request into a scoped feature spec, implementation plan, and evaluation strategy for an assistant that helps teams build better tasks.",
    focusAreas: ["requirements shaping", "evaluation strategy", "tradeoffs", "planning"],
    allowedTools: ["LLM agents", "docs", "terminal", "tests"],
    evaluationSignals: ["clear scope", "pragmatic plan", "useful metrics", "evidence of tradeoff awareness"],
    hiddenRisks: ["scope explosion", "missing acceptance criteria", "buzzword-heavy output"],
    estimatedMinutes: 45,
    difficulty: "easy",
    starterFiles: [
      {
        path: "/app/docs/brief.md",
        language: "markdown",
        description: "Loose product brief that needs shaping.",
        content:
          "# Product brief\n\nBuild a better hiring assessment flow for teams using agents.\n\nQuestions:\n- What should the evaluation measure?\n- What should be automated?\n- What should stay human?\n",
      },
    ],
    rubric: [
      {
        id: "judgment",
        label: "Judgment",
        weight: 35,
        description: "How well the candidate narrows scope and makes tradeoffs.",
        whatGoodLooksLike: ["cuts unnecessary features", "protects the user journey", "states assumptions"],
      },
      {
        id: "agent_orchestration",
        label: "Orchestration",
        weight: 20,
        description: "How the candidate uses agents to turn the brief into a plan.",
        whatGoodLooksLike: ["uses the model as a planner, not a crutch", "organizes outputs", "keeps iterations controlled"],
      },
      {
        id: "logic",
        label: "Logic",
        weight: 20,
        description: "Whether the plan is coherent and implementable.",
        whatGoodLooksLike: ["acceptance criteria are testable", "dependencies are explicit", "flow is linear enough to execute"],
      },
      {
        id: "testing",
        label: "Testing",
        weight: 15,
        description: "Evaluation methods and acceptance checks.",
        whatGoodLooksLike: ["defines success metrics", "suggests test cases", "covers failure modes"],
      },
      {
        id: "communication",
        label: "Communication",
        weight: 10,
        description: "The clarity of the final plan.",
        whatGoodLooksLike: ["exec-ready summary", "concise rationale", "readable by non-specialists"],
      },
    ],
  },
];

const assessments: AssessmentRecord[] = [
  {
    id: "assess_001",
    slug: "agentic-support-engineer",
    title: "Agentic Support Engineer",
    role: "Full-Stack Engineer",
    team: "Customer Experience Platform",
    source: "prd",
    status: "active",
    mode: "agent-native",
    difficulty: "medium",
    templateId: "agent-support-triage",
    owner: "Maya Chen",
    summary:
      "Candidates build a triage workflow that uses agents for classification and research while keeping human escalation explicit.",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(1),
    timeLimitMinutes: 75,
    candidateLimit: 80,
    invitedCount: 42,
    startedCount: 19,
    completedCount: 12,
    averageScore: 84,
    passRate: 0.67,
    tags: ["support", "automation", "guardrails"],
    rubricFocus: ["agent_orchestration", "logic", "judgment"],
    notes: "Best fit for candidates who know how to use agents without surrendering control.",
    sharePath: "/take/agentic-support-engineer",
    invites: [
      {
        email: "alice@example.com",
        fullName: "Alice Nguyen",
        status: "started",
        invitedAt: daysAgo(5),
        openedAt: daysAgo(5),
        startedAt: daysAgo(4),
        candidateId: "cand_001",
        sessionId: "sess_001",
      },
      {
        email: "bob@example.com",
        fullName: "Bob Patel",
        status: "completed",
        invitedAt: daysAgo(5),
        openedAt: daysAgo(5),
        startedAt: daysAgo(4),
        completedAt: daysAgo(4),
        candidateId: "cand_002",
        sessionId: "sess_002",
      },
      {
        email: "carol@example.com",
        fullName: "Carol Mensah",
        status: "sent",
        invitedAt: daysAgo(2),
        candidateId: "cand_003",
      },
    ],
  },
  {
    id: "assess_002",
    slug: "incident-coordinator",
    title: "Incident Coordinator",
    role: "Senior Platform Engineer",
    team: "Infrastructure",
    source: "generated",
    status: "active",
    mode: "hybrid",
    difficulty: "hard",
    templateId: "agent-incident-response",
    owner: "Jordan Lee",
    summary:
      "A recovery workflow where agents gather evidence, but the candidate must decide what to trust and when to stop automation.",
    createdAt: daysAgo(9),
    updatedAt: hoursAgo(16),
    timeLimitMinutes: 90,
    candidateLimit: 60,
    invitedCount: 29,
    startedCount: 15,
    completedCount: 8,
    averageScore: 81,
    passRate: 0.54,
    tags: ["reliability", "incident", "operations"],
    rubricFocus: ["logic", "agent_orchestration", "judgment"],
    notes: "Use this to judge calm technical decision-making under ambiguity.",
    sharePath: "/take/incident-coordinator",
    invites: [
      {
        email: "diego@example.com",
        fullName: "Diego Kim",
        status: "opened",
        invitedAt: daysAgo(8),
        openedAt: daysAgo(7),
        candidateId: "cand_004",
      },
      {
        email: "elena@example.com",
        fullName: "Elena Ivanov",
        status: "started",
        invitedAt: daysAgo(8),
        openedAt: daysAgo(7),
        startedAt: daysAgo(7),
        candidateId: "cand_005",
        sessionId: "sess_005",
      },
    ],
  },
  {
    id: "assess_003",
    slug: "data-reconciliation-specialist",
    title: "Data Reconciliation Specialist",
    role: "Backend Engineer",
    team: "Data Platform",
    source: "github",
    status: "paused",
    mode: "agent-native",
    difficulty: "medium",
    templateId: "agent-data-reconciliation",
    owner: "Priya Shah",
    summary:
      "Assess how well candidates can orchestrate helpers to reconcile conflicting records and explain their final decisions.",
    createdAt: daysAgo(13),
    updatedAt: daysAgo(2),
    timeLimitMinutes: 60,
    candidateLimit: 50,
    invitedCount: 23,
    startedCount: 16,
    completedCount: 10,
    averageScore: 79,
    passRate: 0.6,
    tags: ["data", "deduplication", "explanation"],
    rubricFocus: ["logic", "judgment", "testing"],
    notes: "Good for seeing whether candidates can make defensible merge calls.",
    sharePath: "/take/data-reconciliation-specialist",
    invites: [],
  },
  {
    id: "assess_004",
    slug: "product-planner",
    title: "Agent Product Planner",
    role: "Product Engineer",
    team: "Developer Experience",
    source: "prd",
    status: "completed",
    mode: "pairing",
    difficulty: "easy",
    templateId: "agent-product-planner",
    owner: "Sam Rivera",
    summary:
      "A planning task that tests whether candidates can use agents to sharpen a vague brief without losing the business goal.",
    createdAt: daysAgo(21),
    updatedAt: daysAgo(14),
    timeLimitMinutes: 45,
    candidateLimit: 40,
    invitedCount: 54,
    startedCount: 37,
    completedCount: 31,
    averageScore: 87,
    passRate: 0.74,
    tags: ["planning", "product", "evaluation"],
    rubricFocus: ["judgment", "communication", "agent_orchestration"],
    notes: "Great calibration challenge for mixed product and engineering roles.",
    sharePath: "/take/product-planner",
    invites: [],
  },
  {
    id: "assess_005",
    slug: "qa-agent-builder",
    title: "QA Agent Builder",
    role: "QA Automation Engineer",
    team: "Quality Systems",
    source: "manual",
    status: "draft",
    mode: "agent-native",
    difficulty: "hard",
    templateId: "agent-support-triage",
    owner: "Nina Brooks",
    summary:
      "Draft assessment for candidates who can use agents to generate tests, verify behavior, and challenge their own assumptions.",
    createdAt: daysAgo(3),
    updatedAt: hoursAgo(8),
    timeLimitMinutes: 80,
    candidateLimit: 25,
    invitedCount: 0,
    startedCount: 0,
    completedCount: 0,
    averageScore: 0,
    passRate: 0,
    tags: ["qa", "automation", "agents"],
    rubricFocus: ["testing", "logic", "agent_orchestration"],
    notes: "A good template for teams that want stronger testing discipline.",
    sharePath: "/take/qa-agent-builder",
    invites: [],
  },
];

const candidates: CandidateRecord[] = [
  {
    id: "cand_001",
    assessmentId: "assess_001",
    sessionId: "sess_001",
    scorecardId: "score_001",
    fullName: "Alice Nguyen",
    email: "alice@example.com",
    headline: "Uses agents to move fast without losing control",
    company: "Northstar Labs",
    title: "Senior Frontend Engineer",
    location: "San Francisco, CA",
    status: "in_progress",
    experienceYears: 6,
    invitedAt: daysAgo(5),
    startedAt: daysAgo(4),
    lastSeenAt: hoursAgo(2),
    agentToolPreference: ["browser agent", "terminal assistant", "prompt logs"],
    summary: "Strong at decomposition and testing; still working on when to stop an agent from over-optimizing.",
    strengths: ["structured thinking", "fast validation", "clear notes"],
    risks: ["can overuse agent chaining", "sometimes needs stronger scope control"],
  },
  {
    id: "cand_002",
    assessmentId: "assess_001",
    sessionId: "sess_002",
    scorecardId: "score_002",
    fullName: "Bob Patel",
    email: "bob@example.com",
    headline: "Pragmatic builder with good judgment under ambiguity",
    company: "Cinderline",
    title: "Backend Engineer",
    location: "Austin, TX",
    status: "completed",
    experienceYears: 8,
    invitedAt: daysAgo(5),
    startedAt: daysAgo(4),
    completedAt: daysAgo(4),
    lastSeenAt: daysAgo(4),
    agentToolPreference: ["code agent", "log search", "unit tests"],
    summary: "Consistently made safe decisions and documented every escalation point.",
    strengths: ["judgment", "clean tests", "calm communication"],
    risks: ["could be more aggressive about automation boundaries"],
  },
  {
    id: "cand_003",
    assessmentId: "assess_001",
    fullName: "Carol Mensah",
    email: "carol@example.com",
    headline: "Fast planner with strong product intuition",
    company: "Brightframe",
    title: "Product Engineer",
    location: "New York, NY",
    status: "invited",
    experienceYears: 5,
    invitedAt: daysAgo(2),
    lastSeenAt: daysAgo(2),
    agentToolPreference: ["spec agent", "drafting agent"],
    summary: "Not started yet, but profile suggests strong alignment with planning-heavy tasks.",
    strengths: ["communication", "product thinking", "speed"],
    risks: ["needs more evidence on deep implementation tasks"],
  },
  {
    id: "cand_004",
    assessmentId: "assess_002",
    scorecardId: "score_003",
    fullName: "Diego Kim",
    email: "diego@example.com",
    headline: "Reliable incident operator",
    company: "Telemetry Works",
    title: "Platform Engineer",
    location: "Seattle, WA",
    status: "reviewed",
    experienceYears: 9,
    invitedAt: daysAgo(8),
    startedAt: daysAgo(7),
    completedAt: daysAgo(7),
    lastSeenAt: daysAgo(7),
    agentToolPreference: ["log agent", "shell", "status summary agent"],
    summary: "Handled the noisy input well and kept a strong incident narrative.",
    strengths: ["incident triage", "clarity", "rollback planning"],
    risks: ["could document evidence more thoroughly"],
  },
  {
    id: "cand_005",
    assessmentId: "assess_002",
    sessionId: "sess_005",
    fullName: "Elena Ivanov",
    email: "elena@example.com",
    headline: "Methodical, with very strong output hygiene",
    company: "Cloudfrontier",
    title: "Staff Engineer",
    location: "Toronto, ON",
    status: "in_progress",
    experienceYears: 11,
    invitedAt: daysAgo(8),
    startedAt: daysAgo(7),
    lastSeenAt: hoursAgo(5),
    agentToolPreference: ["evidence agent", "terminal assistant", "notes agent"],
    summary: "Needs a little more decisive escalation behavior, but strong overall process.",
    strengths: ["systematic", "documented reasoning", "tool discipline"],
    risks: ["may spend too long validating low-risk paths"],
  },
  {
    id: "cand_006",
    assessmentId: "assess_002",
    sessionId: "sess_006",
    fullName: "Farah Okafor",
    email: "farah@example.com",
    headline: "Fast operator who leaves strong audit trails",
    company: "BeaconRail",
    title: "Site Reliability Engineer",
    location: "Chicago, IL",
    status: "completed",
    experienceYears: 7,
    invitedAt: daysAgo(6),
    startedAt: daysAgo(6),
    completedAt: daysAgo(6),
    lastSeenAt: daysAgo(6),
    agentToolPreference: ["incident agent", "log query agent", "notes agent"],
    summary: "Submission is complete but still awaiting reviewer sign-off.",
    strengths: ["operational discipline", "clear handoff notes", "structured response"],
    risks: ["needs faster escalation on uncertain cases"],
  },
];

const sessions: AssessmentSessionRecord[] = [
  {
    id: "sess_001",
    assessmentId: "assess_001",
    candidateId: "cand_001",
    status: "active",
    createdAt: daysAgo(4),
    startedAt: daysAgo(4),
    expiresAt: daysAgo(-1),
    timeLimitMinutes: 75,
    currentQuestionIndex: 0,
    codeServerUrl: "https://codeserver.local/sess_001",
    workspaceLabel: "support-triage-workspace",
    heartbeatAt: hoursAgo(2),
    events: [
      { at: daysAgo(4), label: "Session started", detail: "Candidate opened the workspace and began the triage workflow." },
      { at: daysAgo(4), label: "Agent chain created", detail: "Classification, research, and response steps were connected." },
      { at: hoursAgo(2), label: "Heartbeat received", detail: "Workspace is still active." },
    ],
  },
  {
    id: "sess_002",
    assessmentId: "assess_001",
    candidateId: "cand_002",
    status: "completed",
    createdAt: daysAgo(4),
    startedAt: daysAgo(4),
    endedAt: daysAgo(4),
    expiresAt: daysAgo(-1),
    timeLimitMinutes: 75,
    currentQuestionIndex: 0,
    codeServerUrl: "https://codeserver.local/sess_002",
    workspaceLabel: "support-triage-workspace",
    stopReason: "submitted",
    heartbeatAt: daysAgo(4),
    events: [
      { at: daysAgo(4), label: "Session started", detail: "Candidate initialized the workspace." },
      { at: daysAgo(4), label: "Submission received", detail: "Candidate submitted the final workflow and tests." },
      { at: daysAgo(4), label: "Session completed", detail: "The assessment was marked complete." },
    ],
  },
  {
    id: "sess_004",
    assessmentId: "assess_002",
    candidateId: "cand_004",
    status: "completed",
    createdAt: daysAgo(7),
    startedAt: daysAgo(7),
    endedAt: daysAgo(7),
    expiresAt: daysAgo(-2),
    timeLimitMinutes: 90,
    currentQuestionIndex: 0,
    codeServerUrl: "https://codeserver.local/sess_004",
    workspaceLabel: "incident-response-workspace",
    stopReason: "submitted",
    heartbeatAt: daysAgo(7),
    events: [
      { at: daysAgo(7), label: "Incident brief opened", detail: "Candidate reviewed the alert stream and task brief." },
      { at: daysAgo(7), label: "Evidence gathered", detail: "Candidate queried logs and service state before deciding." },
      { at: daysAgo(7), label: "Final handoff", detail: "Candidate produced the postmortem summary and next steps." },
    ],
  },
  {
    id: "sess_005",
    assessmentId: "assess_002",
    candidateId: "cand_005",
    status: "active",
    createdAt: daysAgo(7),
    startedAt: daysAgo(7),
    expiresAt: daysAgo(1),
    timeLimitMinutes: 90,
    currentQuestionIndex: 0,
    codeServerUrl: "https://codeserver.local/sess_005",
    workspaceLabel: "incident-response-workspace",
    heartbeatAt: hoursAgo(5),
    events: [
      { at: daysAgo(7), label: "Session started", detail: "Candidate entered the incident response workspace." },
      { at: hoursAgo(5), label: "Heartbeat received", detail: "Candidate still active and iterating on the solution." },
    ],
  },
  {
    id: "sess_006",
    assessmentId: "assess_002",
    candidateId: "cand_006",
    status: "completed",
    createdAt: daysAgo(6),
    startedAt: daysAgo(6),
    endedAt: daysAgo(6),
    expiresAt: daysFromNow(1),
    timeLimitMinutes: 90,
    currentQuestionIndex: 0,
    codeServerUrl: "https://codeserver.local/sess_006",
    workspaceLabel: "incident-response-workspace",
    stopReason: "submitted",
    heartbeatAt: daysAgo(6),
    events: [
      { at: daysAgo(6), label: "Session started", detail: "Candidate entered the incident workspace." },
      { at: daysAgo(6), label: "Submission received", detail: "Candidate finished but the reviewer has not signed off yet." },
    ],
  },
];

const scorecards: ScorecardRecord[] = [
  {
    id: "score_001",
    assessmentId: "assess_001",
    sessionId: "sess_001",
    candidateId: "cand_001",
    reviewer: "Maya Chen",
    reviewedAt: daysAgo(3),
    decision: "yes",
    totalScore: 83,
    maxScore: 100,
    band: "Hire",
    summary:
      "Strong agent coordination and solid validation habits. The candidate understood when to let the model work and when to impose hard rules.",
    strengths: ["workflow design", "test coverage", "clear escalation criteria"],
    risks: ["could tighten scope earlier", "slightly verbose solution notes"],
    nextStep: "Move to a live pairing round focused on ambiguity and tradeoffs.",
    evidence: [
      "Separated automated, researched, and human-reviewed branches.",
      "Added guardrails around confidence thresholds.",
      "Used tests to prove safe fallbacks.",
    ],
    dimensions: [
      {
        dimensionId: "logic",
        label: "Logic",
        score: 21,
        maxScore: 25,
        evidence: ["Routing rules are deterministic.", "Edge cases handled explicitly."],
      },
      {
        dimensionId: "agent_orchestration",
        label: "Orchestration",
        score: 26,
        maxScore: 30,
        evidence: ["Clear multi-agent sequence.", "Good use of verification steps."],
      },
      {
        dimensionId: "judgment",
        label: "Judgment",
        score: 21,
        maxScore: 25,
        evidence: ["Escalation thresholds are sensible.", "Risky cases are blocked."],
      },
      {
        dimensionId: "testing",
        label: "Testing",
        score: 8,
        maxScore: 10,
        evidence: ["Covers noisy input and fallback behavior."],
      },
      {
        dimensionId: "communication",
        label: "Communication",
        score: 7,
        maxScore: 10,
        evidence: ["Readable explanation of the workflow and tradeoffs."],
      },
    ],
  },
  {
    id: "score_002",
    assessmentId: "assess_001",
    sessionId: "sess_002",
    candidateId: "cand_002",
    reviewer: "Maya Chen",
    reviewedAt: daysAgo(3),
    decision: "strong_yes",
    totalScore: 91,
    maxScore: 100,
    band: "Strong Hire",
    summary:
      "Excellent control of the workflow. The candidate used agents as tools, not as substitutes for reasoning.",
    strengths: ["judgment", "risk control", "high-signal notes"],
    risks: ["could have added one more stress test"],
    nextStep: "Skip straight to final round or team interview.",
    evidence: [
      "Kept human review in the loop for sensitive issues.",
      "Documented assumptions clearly.",
      "Resolved ambiguous cases without overfitting the prompt.",
    ],
    dimensions: [
      { dimensionId: "logic", label: "Logic", score: 24, maxScore: 25, evidence: ["Very few gaps in reasoning."] },
      { dimensionId: "agent_orchestration", label: "Orchestration", score: 28, maxScore: 30, evidence: ["Clean tool boundaries and retries."] },
      { dimensionId: "judgment", label: "Judgment", score: 24, maxScore: 25, evidence: ["Excellent risk gating."] },
      { dimensionId: "testing", label: "Testing", score: 7, maxScore: 10, evidence: ["Could add a stress scenario."] },
      { dimensionId: "communication", label: "Communication", score: 8, maxScore: 10, evidence: ["Concise and readable summary."] },
    ],
  },
  {
    id: "score_003",
    assessmentId: "assess_002",
    sessionId: "sess_004",
    candidateId: "cand_004",
    reviewer: "Jordan Lee",
    reviewedAt: daysAgo(5),
    decision: "yes",
    totalScore: 86,
    maxScore: 100,
    band: "Hire",
    summary:
      "Good incident judgment and strong signal extraction. The candidate understood how to keep automation safe under pressure.",
    strengths: ["signal handling", "rollback thinking", "clear incident narrative"],
    risks: ["documentation could be more complete"],
    nextStep: "Run a deeper systems discussion about failure domains.",
    evidence: [
      "Separated noisy alerts from actionable ones.",
      "Produced a safe rollback recommendation.",
      "Explained uncertainty instead of guessing root cause.",
    ],
    dimensions: [
      { dimensionId: "logic", label: "Logic", score: 21, maxScore: 25, evidence: ["Sound alert normalization and dedupe."] },
      { dimensionId: "agent_orchestration", label: "Orchestration", score: 23, maxScore: 25, evidence: ["Used evidence agents efficiently."] },
      { dimensionId: "judgment", label: "Judgment", score: 26, maxScore: 30, evidence: ["Good escalation discipline."] },
      { dimensionId: "testing", label: "Testing", score: 8, maxScore: 10, evidence: ["Covered failure and recovery paths."] },
      { dimensionId: "communication", label: "Communication", score: 8, maxScore: 10, evidence: ["Postmortem note was easy to follow."] },
    ],
  },
];

const assessmentById = new Map(assessments.map((assessment) => [assessment.id, assessment] as const));
const assessmentBySlug = new Map(assessments.map((assessment) => [assessment.slug, assessment] as const));
const templateById = new Map(taskTemplates.map((template) => [template.id, template] as const));
const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate] as const));
const candidateByEmail = new Map(candidates.map((candidate) => [candidate.email.toLowerCase(), candidate] as const));
const sessionById = new Map(sessions.map((session) => [session.id, session] as const));
const scorecardBySessionId = new Map(scorecards.map((scorecard) => [scorecard.sessionId, scorecard] as const));
const scorecardById = new Map(scorecards.map((scorecard) => [scorecard.id, scorecard] as const));

function assessmentStatusLabel(status: AssessmentStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "active":
      return "Live";
    case "paused":
      return "Paused";
    case "completed":
      return "Completed";
    default:
      return status;
  }
}

function sessionStatusLabel(status: SessionStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    case "expired":
      return "Expired";
    case "abandoned":
      return "Abandoned";
    default:
      return status;
  }
}

function countSessions(status: SessionStatus): number {
  return sessions.filter((session) => session.status === status).length;
}

function getAssessmentCandidateCount(assessmentId: string): number {
  return candidates.filter((candidate) => candidate.assessmentId === assessmentId).length;
}

function getAssessmentCompletedCount(assessmentId: string): number {
  return scorecards.filter((scorecard) => scorecard.assessmentId === assessmentId).length;
}

function getAssessmentScoreAverage(assessmentId: string): number {
  const items = scorecards.filter((scorecard) => scorecard.assessmentId === assessmentId);
  if (items.length === 0) return 0;
  return round(items.reduce((sum, item) => sum + item.totalScore, 0) / items.length, 1);
}

function getInviteSummary(invites: AssessmentInvite[]) {
  return {
    total: invites.length,
    sent: invites.filter((invite) => invite.status === "sent").length,
    opened: invites.filter((invite) => invite.status === "opened").length,
    started: invites.filter((invite) => invite.status === "started").length,
    completed: invites.filter((invite) => invite.status === "completed").length,
  };
}

export function listTaskTemplates(): TaskTemplate[] {
  return clone(taskTemplates);
}

export function getTaskTemplateById(id: string): TaskTemplate | undefined {
  const template = templateById.get(id);
  return template ? clone(template) : undefined;
}

export function listAssessmentSourceOptions(): AssessmentSourceOption[] {
  return [
    {
      source: "github",
      label: "Import GitHub repo",
      description: "Start from an existing codebase and turn it into a live assessment.",
      suggestedTemplateId: "agent-product-planner",
      defaultTitle: "GitHub-to-Assessment Challenge",
      defaultRole: "Full-Stack Engineer",
      defaultDifficulty: "medium",
      defaultTimeLimitMinutes: 60,
      evaluationPromise: "Great for repo fluency, cleanup judgment, and agent-guided implementation.",
    },
    {
      source: "prd",
      label: "Import PRD",
      description: "Turn a requirements document into a structured, graded task.",
      suggestedTemplateId: "agent-support-triage",
      defaultTitle: "PRD-to-Workflow Challenge",
      defaultRole: "Product Engineer",
      defaultDifficulty: "medium",
      defaultTimeLimitMinutes: 75,
      evaluationPromise: "Best when you want to measure planning, decomposition, and tradeoff skill.",
    },
    {
      source: "generated",
      label: "Generate new",
      description: "Use a seeded template and adapt it for a new role or domain.",
      suggestedTemplateId: "agent-incident-response",
      defaultTitle: "Generated Agent Workflow Challenge",
      defaultRole: "Platform Engineer",
      defaultDifficulty: "hard",
      defaultTimeLimitMinutes: 90,
      evaluationPromise: "Ideal for teams that want to move fast without starting from scratch.",
    },
    {
      source: "manual",
      label: "Build manually",
      description: "Start with a clean slate and define your own rubric and task.",
      suggestedTemplateId: "agent-data-reconciliation",
      defaultTitle: "Custom Agent-Native Assessment",
      defaultRole: "Backend Engineer",
      defaultDifficulty: "hard",
      defaultTimeLimitMinutes: 60,
      evaluationPromise: "Useful for bespoke roles where the problem itself is the signal.",
    },
  ];
}

export function getCreateAssessmentDefaults(source: AssessmentSource = "generated"): CreateAssessmentDefaults {
  const option = listAssessmentSourceOptions().find((entry) => entry.source === source) ?? listAssessmentSourceOptions()[0];
  const template = templateById.get(option.suggestedTemplateId) ?? taskTemplates[0];

  return {
    source,
    title: option.defaultTitle,
    role: option.defaultRole,
    difficulty: option.defaultDifficulty,
    timeLimitMinutes: option.defaultTimeLimitMinutes,
    templateId: template.id,
    prompt: template.problemStatement,
    focusAreas: clone(template.focusAreas),
    notes: `Seeded from ${template.title}. Candidates can use agents, but the rubric rewards reasoning, orchestration, and judgment.`,
  };
}

export function listAssessments(): AssessmentRecord[] {
  return clone(assessments);
}

export function getAssessmentById(id: string): AssessmentRecord | undefined {
  const assessment = assessmentById.get(id);
  return assessment ? clone(assessment) : undefined;
}

export function getAssessmentBySlug(slug: string): AssessmentRecord | undefined {
  const assessment = assessmentBySlug.get(slug);
  return assessment ? clone(assessment) : undefined;
}

export function listAssessmentCards(): DashboardAssessmentCard[] {
  return assessments
    .map((assessment) => {
      const template = templateById.get(assessment.templateId);
      const candidateCount = getAssessmentCandidateCount(assessment.id);
      const completedCount = getAssessmentCompletedCount(assessment.id);
      const averageScore = getAssessmentScoreAverage(assessment.id);
      const needsReview = sessions.some(
        (session) =>
          session.assessmentId === assessment.id &&
          session.status === "completed" &&
          !scorecardBySessionId.has(session.id),
      );

      return {
        id: assessment.id,
        title: assessment.title,
        role: assessment.role,
        status: assessment.status,
        statusLabel: assessmentStatusLabel(assessment.status),
        source: assessment.source,
        difficulty: assessment.difficulty,
        candidateCount,
        completedCount,
        averageScore,
        passRate: assessment.passRate,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
        createdLabel: formatRelative(assessment.createdAt),
        updatedLabel: formatRelative(assessment.updatedAt),
        templateTitle: template?.title ?? "Unknown template",
        tags: clone(assessment.tags),
        needsReview,
      };
    })
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export function getAssessmentSummaryStats(): AssessmentSummaryStats {
  const totalCandidates = candidates.length;
  const completedSubmissions = sessions.filter(
    (session) => session.status === "completed" && !scorecardBySessionId.has(session.id),
  ).length;
  const reviewedSubmissions = scorecards.length;
  const totalScore = scorecards.reduce((sum, scorecard) => sum + scorecard.totalScore, 0);
  const totalMax = scorecards.reduce((sum, scorecard) => sum + scorecard.maxScore, 0);

  return {
    activeAssessments: assessments.filter((assessment) => assessment.status === "active").length,
    draftAssessments: assessments.filter((assessment) => assessment.status === "draft").length,
    completedAssessments: assessments.filter((assessment) => assessment.status === "completed").length,
    totalCandidates,
    sessionsRunning: countSessions("active"),
    needsReview: completedSubmissions,
    averageScore: totalMax === 0 ? 0 : round((totalScore / totalMax) * 100, 0),
    passRate:
      reviewedSubmissions === 0
        ? 0
        : round(
            (scorecards.filter((scorecard) => scorecard.decision === "yes" || scorecard.decision === "strong_yes").length /
              reviewedSubmissions) *
              100,
            0,
          ),
  };
}

export function getAssessmentInviteSummary(assessmentId: string) {
  const assessment = assessmentById.get(assessmentId);
  return assessment ? getInviteSummary(assessment.invites) : getInviteSummary([]);
}

export function getSendAssessmentModel(assessmentId: string): SendAssessmentModel | undefined {
  const assessment = assessmentById.get(assessmentId);
  if (!assessment) return undefined;

  const template = templateById.get(assessment.templateId);
  if (!template) return undefined;

  const relatedCandidates = candidates.filter((candidate) => candidate.assessmentId === assessmentId);
  const recentCandidates = relatedCandidates
    .slice()
    .sort((left, right) => Date.parse(right.lastSeenAt ?? right.invitedAt) - Date.parse(left.lastSeenAt ?? left.invitedAt));

  return {
    assessment: clone(assessment),
    template: clone(template),
    shareUrl: `https://techassess.local${assessment.sharePath}`,
    copySubject: `Invitation: ${assessment.title}`,
    copyBody: `${assessment.title} is ready. Candidates can use agents freely, but the rubric rewards reasoning, orchestration, and judgment.`,
    inviteSummary: getInviteSummary(assessment.invites),
    invites: clone(assessment.invites),
    recentCandidates: clone(recentCandidates),
  };
}

export function getDashboardModel() {
  const stats = getAssessmentSummaryStats();
  const cards = listAssessmentCards();

  return {
    stats,
    cards,
    spotlight: cards.filter((card) => card.needsReview || card.status === "active").slice(0, 3),
    recentAssessments: cards.slice(0, 4),
  };
}

export function getCandidateById(id: string): CandidateRecord | undefined {
  const candidate = candidateById.get(id);
  return candidate ? clone(candidate) : undefined;
}

export function getCandidateByEmail(email: string): CandidateRecord | undefined {
  const candidate = candidateByEmail.get(email.toLowerCase());
  return candidate ? clone(candidate) : undefined;
}

export function getScorecardBySession(sessionId: string): ScorecardRecord | undefined {
  const scorecard = scorecardBySessionId.get(sessionId);
  return scorecard ? clone(scorecard) : undefined;
}

export function getSessionById(id: string): AssessmentSessionRecord | undefined {
  const session = sessionById.get(id);
  return session ? clone(session) : undefined;
}

export function getSessionWorkspaceModel(sessionId: string): SessionWorkspaceModel | undefined {
  const session = sessionById.get(sessionId);
  if (!session) return undefined;

  const assessment = assessmentById.get(session.assessmentId);
  const candidate = candidateById.get(session.candidateId);
  if (!assessment || !candidate) return undefined;

  const template = templateById.get(assessment.templateId);
  if (!template) return undefined;

  const scorecard = scorecardBySessionId.get(sessionId);
  const progressLabel =
    session.status === "completed"
      ? "Finished"
      : session.status === "active"
        ? "In progress"
        : sessionStatusLabel(session.status);

  return {
    session: clone(session),
    assessment: clone(assessment),
    candidate: clone(candidate),
    template: clone(template),
    scorecard: scorecard ? clone(scorecard) : undefined,
    progressLabel,
    timeLimitMinutes: session.timeLimitMinutes,
    workspaceFiles: clone(template.starterFiles),
    rubric: clone(template.rubric),
    allowedTools: clone(template.allowedTools),
    evaluationSignals: clone(template.evaluationSignals),
  };
}

export function getCandidateDashboardModel(candidateIdOrEmail: string): CandidateDashboardModel | undefined {
  const candidate =
    candidateById.get(candidateIdOrEmail) ?? candidateByEmail.get(candidateIdOrEmail.toLowerCase());

  if (!candidate) return undefined;

  const assessment = assessmentById.get(candidate.assessmentId);
  if (!assessment) return undefined;

  const template = templateById.get(assessment.templateId);
  if (!template) return undefined;

  const session = candidate.sessionId ? sessionById.get(candidate.sessionId) : undefined;
  const scorecard = candidate.scorecardId
    ? scorecardById.get(candidate.scorecardId)
    : session
      ? scorecardBySessionId.get(session.id)
      : undefined;

  let headline = "Your assessment is ready.";
  let primaryAction = "Start Assessment";
  let secondaryAction = "Review role details";
  let statusLabel = "Invited";

  if (session?.status === "active") {
    headline = "Your assessment is live.";
    primaryAction = "Continue Assessment";
    secondaryAction = "View task rubric";
    statusLabel = "In progress";
  } else if (session?.status === "completed" && scorecard) {
    headline = "Your submission has been reviewed.";
    primaryAction = "Review results";
    secondaryAction = "Start another session";
    statusLabel = "Completed";
  } else if (session?.status === "completed") {
    headline = "Your submission is waiting on review.";
    primaryAction = "View submission";
    secondaryAction = "See rubric";
    statusLabel = "Awaiting review";
  } else if (candidate.status === "reviewed") {
    headline = "Your work has been scored.";
    primaryAction = "View feedback";
    secondaryAction = "See rubric";
    statusLabel = "Reviewed";
  }

  return {
    candidate: clone(candidate),
    assessment: clone(assessment),
    template: clone(template),
    session: session ? clone(session) : undefined,
    scorecard: scorecard ? clone(scorecard) : undefined,
    headline,
    primaryAction,
    secondaryAction,
    statusLabel,
    timeline: session ? clone(session.events) : [],
    evaluationFocus: clone(template.focusAreas),
  };
}

export function listCandidatesForAssessment(assessmentId: string): CandidateRecord[] {
  return candidates.filter((candidate) => candidate.assessmentId === assessmentId).map((candidate) => clone(candidate));
}

export function listSessionsForAssessment(assessmentId: string): AssessmentSessionRecord[] {
  return sessions.filter((session) => session.assessmentId === assessmentId).map((session) => clone(session));
}

export function listScorecardsForAssessment(assessmentId: string): ScorecardRecord[] {
  return scorecards.filter((scorecard) => scorecard.assessmentId === assessmentId).map((scorecard) => clone(scorecard));
}

export function getPublicAssessmentPath(assessmentId: string): string | undefined {
  const assessment = assessmentById.get(assessmentId);
  return assessment?.sharePath;
}

export function getScorecardById(id: string): ScorecardRecord | undefined {
  const scorecard = scorecardById.get(id);
  return scorecard ? clone(scorecard) : undefined;
}

export const mvpSeed = {
  assessments,
  candidates,
  scorecards,
  sessions,
  taskTemplates,
} as const;
