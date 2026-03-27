import {
  getAssessmentById,
  getAssessmentBySlug,
  getSessionWorkspaceModel,
  getTaskTemplateById,
  listAssessments,
  type AssessmentRecord,
} from "@/lib/mvp-data";
import {
  evaluateSubmission,
  inspectCode,
  type CodeSignals,
  type ScoreBreakdown,
} from "./scoring";
import { getDefaultChallengeCases, runChallengeTests, type ExecutionResult } from "./challengeRunner";

export const DEFAULT_ISSUE_TOKEN = "assess_001";
export const LOCAL_REGISTRY_KEY = "techassess.local.registry";
export const LOCAL_INVITE_KEY = "techassess.local.invite";
export const LOCAL_LAST_REPORT_KEY = "techassess.local.report";
export const RECRUITER_ASSESSMENT_STORAGE_KEY = "techassess.recruiter.assessments";

export interface ConsoleEntry {
  id: string;
  at: string;
  stream: "system" | "stdout" | "stderr";
  text: string;
}

export interface ProctorEvent {
  id: string;
  at: string;
  kind: "paste" | "blur" | "visibility";
  detail: string;
}

export interface TestEntry {
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

export interface LocalReport extends ScoreBreakdown {
  sessionId: string;
  candidateName: string;
  assessmentTitle: string;
  completedAt: string;
  elapsedSeconds: number;
  passedTests: number;
  totalTests: number;
  testPassRate: number;
  proctorWarnings: number;
  analysis: string[];
  evidence: string[];
}

export interface LocalSession {
  sessionId: string;
  inviteToken: string;
  assessmentId: string;
  assessmentTitle: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateHeadline: string;
  prompt: string;
  workspaceLabel: string;
  challengeType: "coding" | "system-design" | "vibe-check" | "debug";
  timeLimitMinutes: number;
  startedAt: string;
  submittedAt?: string;
  phase: "invited" | "active" | "completed";
  activeFilePath: string;
  workspaceFiles: Array<{
    path: string;
    language: string;
    description: string;
    content: string;
    locked?: boolean;
  }>;
  codeByPath: Record<string, string>;
  lastSavedAt?: string;
  elapsedSeconds: number;
  runCount: number;
  hintCount: number;
  analysis: string[];
  console: ConsoleEntry[];
  tests: TestEntry[];
  proctorWarnings: ProctorEvent[];
  report?: LocalReport;
  codeSignals?: CodeSignals;
}

interface Registry {
  activeSessionId: string | null;
  inviteToken: string;
  sessions: Record<string, LocalSession>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getRegistry(): Registry {
  return readJson<Registry>(LOCAL_REGISTRY_KEY, {
    activeSessionId: null,
    inviteToken: DEFAULT_ISSUE_TOKEN,
    sessions: {},
  });
}

function saveRegistry(registry: Registry): void {
  writeJson(LOCAL_REGISTRY_KEY, registry);
}

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function loadRecruiterAssessments(): AssessmentRecord[] {
  if (typeof window === "undefined") {
    return clone(listAssessments());
  }

  const raw = window.localStorage.getItem(RECRUITER_ASSESSMENT_STORAGE_KEY);
  if (!raw) {
    const seeded = clone(listAssessments());
    window.localStorage.setItem(
      RECRUITER_ASSESSMENT_STORAGE_KEY,
      JSON.stringify(seeded),
    );
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AssessmentRecord[]) : clone(listAssessments());
  } catch {
    return clone(listAssessments());
  }
}

function saveRecruiterAssessments(assessments: AssessmentRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    RECRUITER_ASSESSMENT_STORAGE_KEY,
    JSON.stringify(assessments),
  );
}

function matchesInviteToken(assessment: AssessmentRecord, token: string): boolean {
  const normalizedShareToken = assessment.sharePath.replace(/^\/take\//, "");

  return (
    assessment.id === token ||
    assessment.slug === token ||
    assessment.sharePath === token ||
    normalizedShareToken === token
  );
}

function resolveAssessment(token?: string) {
  const normalized = token?.trim() || getRegistry().inviteToken || DEFAULT_ISSUE_TOKEN;

  const recruiterAssessment = loadRecruiterAssessments().find((assessment) =>
    matchesInviteToken(assessment, normalized),
  );

  return (
    recruiterAssessment ??
    getAssessmentById(normalized) ??
    getAssessmentBySlug(normalized) ??
    getAssessmentById(DEFAULT_ISSUE_TOKEN)
  );
}

function pickInvite(assessment: AssessmentRecord) {
  return (
    assessment.invites.find((invite) => invite.status === "started") ??
    assessment.invites.find((invite) => invite.status === "opened") ??
    assessment.invites.find((invite) => invite.status === "sent") ??
    assessment.invites[0]
  );
}

function getWorkspaceSeed(token?: string) {
  const assessment = resolveAssessment(token);
  if (!assessment) {
    throw new Error("Unable to resolve seeded assessment.");
  }

  const invite = pickInvite(assessment);
  const candidate = {
    id:
      invite?.candidateId ??
      `candidate_${(invite?.email ?? "demo").replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`,
    fullName: invite?.fullName ?? "Demo Candidate",
    email: invite?.email ?? "candidate@techassess.dev",
    headline: invite
      ? `Invited for ${assessment.role}`
      : `Exploring the ${assessment.title} workspace`,
  };

  const template = getTaskTemplateById(assessment.templateId);
  if (!template) {
    throw new Error("Unable to resolve seeded task template.");
  }

  const sessionWorkspace = getSessionWorkspaceModel("sess_001");
  const workspaceFiles =
    sessionWorkspace?.workspaceFiles?.length > 0 ? sessionWorkspace.workspaceFiles : template.starterFiles;

  return {
    assessment,
    candidate,
    invite,
    template,
    workspaceFiles,
  };
}

function buildInitialCodeByPath(files: LocalSession["workspaceFiles"]): Record<string, string> {
  return files.reduce<Record<string, string>>((accumulator, file) => {
    accumulator[file.path] = file.content;
    return accumulator;
  }, {});
}

function deriveActiveFile(files: LocalSession["workspaceFiles"]): string {
  return files[0]?.path ?? "";
}

function persistSession(session: LocalSession): LocalSession {
  const registry = getRegistry();
  registry.sessions[session.sessionId] = session;
  registry.activeSessionId = session.phase === "completed" ? null : session.sessionId;
  saveRegistry(registry);
  return session;
}

function syncInviteStatus(
  assessmentId: string,
  email: string | undefined,
  status: "opened" | "started" | "completed",
): void {
  if (!email) return;

  const assessments = loadRecruiterAssessments();
  const now = nowIso();

  const next = assessments.map((assessment) => {
    if (assessment.id !== assessmentId) return assessment;

    const invites = assessment.invites.map((invite) => {
      if (invite.email !== email) return invite;

      return {
        ...invite,
        status,
        openedAt:
          status === "opened" || status === "started" || status === "completed"
            ? invite.openedAt ?? now
            : invite.openedAt,
        startedAt:
          status === "started" || status === "completed"
            ? invite.startedAt ?? now
            : invite.startedAt,
        completedAt: status === "completed" ? invite.completedAt ?? now : invite.completedAt,
      };
    });

    const completedCount = invites.filter((invite) => invite.status === "completed").length;

    return {
      ...assessment,
      invites,
      invitedCount: invites.length,
      startedCount: invites.filter(
        (invite) => invite.status === "started" || invite.status === "completed",
      ).length,
      completedCount,
      status:
        invites.length > 0 && completedCount === invites.length
          ? "completed"
          : assessment.status === "draft"
            ? "active"
            : assessment.status,
      updatedAt: now,
    };
  });

  saveRecruiterAssessments(next);
}

/**
 * Persist the current invite token for the local MVP.
 */
export function setInviteToken(token: string): void {
  const registry = getRegistry();
  registry.inviteToken = token || DEFAULT_ISSUE_TOKEN;
  saveRegistry(registry);
}

/**
 * Read the current invite token for the local MVP.
 */
export function getInviteToken(): string {
  return getRegistry().inviteToken;
}

/**
 * Resolve the seeded invitation into candidate, assessment, and template data.
 */
export function getInviteContext(token?: string) {
  const { assessment, candidate, invite, template, workspaceFiles } = getWorkspaceSeed(token);

  return {
    assessment,
    candidate,
    invite,
    template,
    workspaceFiles,
  };
}

/**
 * Mark the invite as opened so recruiter-side state reflects engagement.
 */
export function markInviteOpened(token?: string): void {
  const { assessment, invite } = getWorkspaceSeed(token);
  syncInviteStatus(assessment.id, invite?.email, "opened");
}

/**
 * Create a new local assessment session from the current invite.
 */
export function createSessionFromInvite(token?: string): LocalSession {
  const { assessment, candidate, invite, template, workspaceFiles } = getWorkspaceSeed(token);
  const sessionId = createId("sess");
  const startedAt = nowIso();

  const session: LocalSession = {
    sessionId,
    inviteToken: token?.trim() || getRegistry().inviteToken || assessment.id,
    assessmentId: assessment.id,
    assessmentTitle: assessment.title,
    candidateId: candidate.id,
    candidateName: candidate.fullName,
    candidateEmail: candidate.email,
    candidateHeadline: candidate.headline,
    prompt: template.problemStatement,
    workspaceLabel: template.title,
    challengeType: "coding",
    timeLimitMinutes: assessment.timeLimitMinutes,
    startedAt,
    phase: "active",
    activeFilePath: deriveActiveFile(workspaceFiles),
    workspaceFiles,
    codeByPath: buildInitialCodeByPath(workspaceFiles),
    elapsedSeconds: 0,
    runCount: 0,
    hintCount: 0,
    analysis: [],
    console: [
      {
        id: createId("console"),
        at: startedAt,
        stream: "system",
        text: "Workspace initialized. Start by reading the problem statement and shaping the contract.",
      },
    ],
    tests: [],
    proctorWarnings: [],
  };

  const registry = getRegistry();
  registry.sessions[sessionId] = session;
  registry.activeSessionId = sessionId;
  registry.inviteToken = session.inviteToken;
  saveRegistry(registry);
  syncInviteStatus(assessment.id, invite?.email, "started");

  return session;
}

/**
 * Load an existing session or create a new one from the current invite.
 */
export function getOrCreateActiveSession(token?: string): LocalSession {
  const registry = getRegistry();
  const activeSession = registry.activeSessionId ? registry.sessions[registry.activeSessionId] : undefined;
  if (activeSession) {
    return activeSession;
  }

  return createSessionFromInvite(token);
}

/**
 * Load a session by id.
 */
export function getSession(sessionId: string): LocalSession | undefined {
  const registry = getRegistry();
  return registry.sessions[sessionId];
}

/**
 * Update a session and persist it to localStorage.
 */
export function updateSession(sessionId: string, updater: (session: LocalSession) => LocalSession): LocalSession {
  const existing = getSession(sessionId);
  if (!existing) {
    throw new Error("Session not found.");
  }

  return persistSession(updater(existing));
}

/**
 * Append a console entry to the active session.
 */
export function appendConsole(sessionId: string, stream: ConsoleEntry["stream"], text: string): LocalSession {
  return updateSession(sessionId, (session) => ({
    ...session,
    console: [
      ...session.console,
      {
        id: createId("console"),
        at: nowIso(),
        stream,
        text,
      },
    ],
  }));
}

/**
 * Record a proctoring warning in the active session.
 */
export function addProctorWarning(sessionId: string, kind: ProctorEvent["kind"], detail: string): LocalSession {
  return updateSession(sessionId, (session) => ({
    ...session,
    proctorWarnings: [
      ...session.proctorWarnings,
      {
        id: createId("warning"),
        at: nowIso(),
        kind,
        detail,
      },
    ],
  }));
}

/**
 * Update the code buffer for the active file in a session.
 */
export function updateSessionCode(sessionId: string, filePath: string, code: string): LocalSession {
  return updateSession(sessionId, (session) => ({
    ...session,
    codeByPath: {
      ...session.codeByPath,
      [filePath]: code,
    },
    lastSavedAt: nowIso(),
  }));
}

/**
 * Record a hint usage in the session.
 */
export function recordHint(sessionId: string, hint: string): LocalSession {
  return updateSession(sessionId, (session) => ({
    ...session,
    hintCount: session.hintCount + 1,
    analysis: [...session.analysis, hint],
    console: [
      ...session.console,
      {
        id: createId("console"),
        at: nowIso(),
        stream: "system",
        text: hint,
      },
    ],
  }));
}

/**
 * Run the seeded challenge tests against the current submission.
 */
export function runSession(sessionId: string): { session: LocalSession; execution: ExecutionResult } {
  const session = getSession(sessionId);
  if (!session) {
    throw new Error("Session not found.");
  }

  const code = session.codeByPath[session.activeFilePath] ?? "";
  const execution = runChallengeTests(code);

  const codeSignals = inspectCode(code);
  const nextSession = updateSession(sessionId, (current) => ({
    ...current,
    runCount: current.runCount + 1,
    tests: execution.results,
    console: [
      ...current.console,
      ...execution.stdout.map((line) => ({
        id: createId("console"),
        at: nowIso(),
        stream: "stdout" as const,
        text: line,
      })),
      ...execution.stderr.map((line) => ({
        id: createId("console"),
        at: nowIso(),
        stream: "stderr" as const,
        text: line,
      })),
    ],
    codeSignals,
    analysis: [
      ...current.analysis,
      `${execution.passedCount}/${execution.results.length} checks passed on the latest run.`,
    ],
  }));

  return { session: nextSession, execution };
}

/**
 * Build a short review note from the current session state.
 */
export function buildAnalysisLines(session: LocalSession, execution: ExecutionResult | null): string[] {
  const code = session.codeByPath[session.activeFilePath] ?? "";
  const signals = inspectCode(code);
  const tests = execution ?? null;
  const testLine = tests
    ? `${tests.passedCount}/${tests.results.length} tests passed on the latest run.`
    : "No run has been executed yet, so the analysis stays hidden until the first validation pass.";

  const reasoningLine =
    signals.guardClauseCount > 0
      ? "The submission uses guard clauses to keep the control flow explicit."
      : "The control flow still needs a clearer early-exit strategy.";
  const qualityLine =
    signals.hasDescriptiveNames
      ? "The naming is anchored to the problem contract, which makes the intent easy to track."
      : "The naming could say more about the domain and the outcome of each branch.";
  const riskLine =
    session.proctorWarnings.length > 0
      ? "The proctoring trail should be acknowledged in the final explanation."
      : "No proctoring warnings were recorded during this session.";

  return [testLine, reasoningLine, qualityLine, riskLine];
}

/**
 * Suggest the next Socratic hint for the candidate.
 */
export function buildHint(session: LocalSession, execution: ExecutionResult | null): string {
  const failedTests = execution?.results.filter((result) => !result.passed).length ?? session.tests.filter((result) => !result.passed).length;
  const hints = [
    "Start by defining the exact shape routeTicket should return, then make the simplest path pass first.",
    "Treat complianceRisk as a hard stop. What should happen when the answer is unsafe even if the ticket looks simple?",
    "Split the logic into a high-confidence fast path and a fallback path for ambiguous inputs.",
    "Write the branch for the hardest case first so the rest of the code can stay narrow.",
  ];

  return failedTests > 1
    ? hints[Math.min(session.hintCount, hints.length - 1)]
    : "You are close. Tighten the return contract and make sure the note explains the decision, not just the branch.";
}

/**
 * Build a report from the current session state.
 */
export function completeSession(sessionId: string): LocalReport {
  const session = getSession(sessionId);
  if (!session) {
    throw new Error("Session not found.");
  }

  const code = session.codeByPath[session.activeFilePath] ?? "";
  const codeSignals = inspectCode(code);
  const execution = session.tests.length > 0 ? ({ results: session.tests, stdout: [], stderr: [], passedCount: session.tests.filter((test) => test.passed).length, failedCount: session.tests.filter((test) => !test.passed).length } as ExecutionResult) : runChallengeTests(code);
  const correctness = execution.results.length === 0 ? 0 : Math.round((execution.passedCount / execution.results.length) * 100);
  const elapsedSeconds = session.elapsedSeconds;
  const report = evaluateSubmission(code, {
    correctness,
    elapsedSeconds,
    timeLimitSeconds: session.timeLimitMinutes * 60,
    hintCount: session.hintCount,
    proctorWarnings: session.proctorWarnings.length,
    runCount: session.runCount,
    codeSignals,
  });

  const analysis = buildAnalysisLines(session, execution);
  const completedAt = nowIso();
  const finalReport: LocalReport = {
    ...report,
    sessionId: session.sessionId,
    candidateName: session.candidateName,
    assessmentTitle: session.assessmentTitle,
    completedAt,
    elapsedSeconds,
    passedTests: execution.passedCount,
    totalTests: execution.results.length,
    testPassRate: execution.results.length === 0 ? 0 : Math.round((execution.passedCount / execution.results.length) * 100),
    proctorWarnings: session.proctorWarnings.length,
    analysis,
    evidence: [
      `Run count: ${session.runCount}`,
      `Hint count: ${session.hintCount}`,
      `Proctor warnings: ${session.proctorWarnings.length}`,
    ],
  };

  persistSession({
    ...session,
    phase: "completed",
    submittedAt: completedAt,
    codeSignals,
    report: finalReport,
    analysis,
    console: [
      ...session.console,
      {
        id: createId("console"),
        at: completedAt,
        stream: "system",
        text: `Submission recorded. Overall score ${finalReport.overallScore}.`,
      },
    ],
  });

  syncInviteStatus(session.assessmentId, session.candidateEmail, "completed");
  writeJson(LOCAL_LAST_REPORT_KEY, finalReport);
  return finalReport;
}

/**
 * Persist the elapsed time for a session.
 */
export function setElapsedSeconds(sessionId: string, elapsedSeconds: number): LocalSession {
  return updateSession(sessionId, (session) => ({
    ...session,
    elapsedSeconds,
  }));
}

/**
 * Change the active file in the workspace.
 */
export function setActiveFilePath(sessionId: string, filePath: string): LocalSession {
  return updateSession(sessionId, (session) => ({
    ...session,
    activeFilePath: filePath,
  }));
}

/**
 * Reset the active session and invite context.
 */
export function resetLocalSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_REGISTRY_KEY);
  window.localStorage.removeItem(LOCAL_LAST_REPORT_KEY);
}

/**
 * Load the last submitted report if one exists.
 */
export function getLastReport(): LocalReport | null {
  return readJson<LocalReport | null>(LOCAL_LAST_REPORT_KEY, null);
}

/**
 * Clear only the last report while preserving invite state.
 */
export function clearLastReport(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_LAST_REPORT_KEY);
}

/**
 * Find the session that should be treated as active for the current invite.
 */
export function getActiveSession(): LocalSession | null {
  const registry = getRegistry();
  return registry.activeSessionId ? registry.sessions[registry.activeSessionId] ?? null : null;
}

/**
 * Read the seeded challenge cases for the active workspace.
 */
export function listChallengeCases() {
  return getDefaultChallengeCases();
}
