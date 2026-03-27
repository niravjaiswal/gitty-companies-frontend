import {
  mvpSeed,
  type AssessmentDifficulty,
  type AssessmentInvite,
  type AssessmentMode,
  type AssessmentRecord,
  type AssessmentSource,
  type AssessmentStatus,
  type AssessmentSessionRecord,
  type CandidateRecord,
  type CandidateStatus,
  type RubricDimensionId,
  type ScoreDecision,
  type ScorecardRecord,
} from "./mvp-data";
import {
  buildScoreBreakdown,
  compositeScore,
  hiringRecommendationFromScore,
  recommendationFromDecision,
  scoreBand,
  type HiringRecommendation,
  type ScoreInputs,
  type ScoreBreakdown,
} from "./scoring";

export type ProctoringFlagType = "tab-switch" | "paste" | "blur" | "copy" | "idle";
export type ProctoringSeverity = "low" | "medium" | "high";
export type ReportStatus = "draft" | "ready" | "emailed";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AssessmentInviteRecord extends AssessmentInvite {
  id: string;
  assessmentId: string;
  candidateId: string;
  note: string;
  updatedAt: string;
}

export interface CandidateSessionDraft {
  code: string;
  language: string;
  revision: number;
  updatedAt: string;
}

export interface CandidateSessionRecord extends AssessmentSessionRecord {
  draft: CandidateSessionDraft;
  submittedCode: string | null;
  submittedLanguage: string | null;
  submittedAt: string | null;
  updatedAt: string;
  codeServerUrl: string;
}

export interface ProctoringFlagRecord {
  id: string;
  sessionId: string;
  assessmentId: string;
  candidateId: string;
  type: ProctoringFlagType;
  severity: ProctoringSeverity;
  message: string;
  createdAt: string;
  acknowledged: boolean;
}

export interface AssessmentReportRecord {
  id: string;
  assessmentId: string;
  sessionId: string;
  candidateId: string;
  inviteId: string | null;
  reviewer: string;
  createdAt: string;
  updatedAt: string;
  status: ReportStatus;
  compositeScore: number;
  scoreBand: string;
  recommendation: HiringRecommendation;
  summary: string;
  strengths: string[];
  risks: string[];
  nextStep: string;
  evidence: string[];
  breakdown: ScoreBreakdown;
  proctoringFlags: ProctoringFlagRecord[];
}

export interface DomainState {
  version: 1;
  assessments: AssessmentRecord[];
  candidates: CandidateRecord[];
  invites: AssessmentInviteRecord[];
  sessions: CandidateSessionRecord[];
  reports: AssessmentReportRecord[];
  proctoringFlags: ProctoringFlagRecord[];
}

export interface CreateAssessmentInput {
  title: string;
  role: string;
  team: string;
  source: AssessmentSource;
  mode: AssessmentMode;
  difficulty: AssessmentDifficulty;
  templateId: string;
  owner: string;
  summary: string;
  timeLimitMinutes: number;
  candidateLimit: number;
  tags: string[];
  rubricFocus: RubricDimensionId[];
  notes: string;
  sharePath: string;
}

export interface CreateCandidateInput {
  assessmentId: string;
  fullName: string;
  email: string;
  headline: string;
  company: string;
  title: string;
  location: string;
  agentToolPreference: string[];
  summary: string;
}

export interface CreateInviteInput {
  assessmentId: string;
  fullName: string;
  email: string;
  note: string;
}

export interface StartSessionInput {
  assessmentId: string;
  candidateId: string;
  inviteId?: string;
  codeServerUrl?: string;
  workspaceLabel?: string;
}

export interface SaveDraftInput {
  code: string;
  language: string;
}

export interface FlagProctoringInput {
  sessionId: string;
  type: ProctoringFlagType;
  severity?: ProctoringSeverity;
  message: string;
}

export interface SubmitSessionInput extends ScoreInputs {
  sessionId: string;
  reviewer: string;
  summary: string;
  strengths: string[];
  risks: string[];
  nextStep: string;
  evidence: string[];
}

export interface RecruiterDashboardSummary {
  activeAssessments: number;
  draftAssessments: number;
  completedAssessments: number;
  totalCandidates: number;
  sessionsRunning: number;
  needsReview: number;
  averageScore: number;
  passRate: number;
}

export interface CandidateReportView {
  assessment: AssessmentRecord;
  candidate: CandidateRecord;
  session: CandidateSessionRecord;
  report: AssessmentReportRecord | undefined;
  proctoringFlags: ProctoringFlagRecord[];
}

export interface DomainStore {
  getState(): DomainState;
  reset(): DomainState;
  listAssessments(): AssessmentRecord[];
  getAssessmentById(id: string): AssessmentRecord | undefined;
  createAssessment(input: CreateAssessmentInput): AssessmentRecord;
  updateAssessment(id: string, patch: Partial<AssessmentRecord>): AssessmentRecord | undefined;
  createCandidate(input: CreateCandidateInput): CandidateRecord;
  createInvite(input: CreateInviteInput): AssessmentInviteRecord | undefined;
  listInvites(assessmentId?: string): AssessmentInviteRecord[];
  startSession(input: StartSessionInput): CandidateSessionRecord | undefined;
  saveSessionDraft(sessionId: string, input: SaveDraftInput): CandidateSessionRecord | undefined;
  flagProctoring(input: FlagProctoringInput): ProctoringFlagRecord | undefined;
  submitSession(input: SubmitSessionInput): AssessmentReportRecord | undefined;
  listReports(assessmentId?: string): AssessmentReportRecord[];
  getReportBySessionId(sessionId: string): AssessmentReportRecord | undefined;
  getCandidateReportView(sessionId: string): CandidateReportView | undefined;
  getRecruiterSummary(): RecruiterDashboardSummary;
}

const STORAGE_KEY = "devprobe.domain-state.v1";
const DEFAULT_CODE_SERVER_URL = "about:blank";
const DEFAULT_WORKSPACE_LABEL = "Assessment workspace";
const moduleMemoryStorage = createMemoryStorage();

function nowIso(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function makeId(prefix: string): string {
  const entropy = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${entropy}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveStorage(storage?: StorageLike): StorageLike {
  if (storage) return storage;
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  return moduleMemoryStorage;
}

function persistState(storage: StorageLike, state: DomainState): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function parseState(raw: string | null): DomainState | undefined {
  if (!raw) return undefined;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) return undefined;
    if (!Array.isArray(parsed.assessments)) return undefined;
    if (!Array.isArray(parsed.candidates)) return undefined;
    if (!Array.isArray(parsed.invites)) return undefined;
    if (!Array.isArray(parsed.sessions)) return undefined;
    if (!Array.isArray(parsed.reports)) return undefined;
    if (!Array.isArray(parsed.proctoringFlags)) return undefined;
    return parsed as DomainState;
  } catch {
    return undefined;
  }
}

function assessmentStatusFromState(state: DomainState, assessmentId: string): AssessmentStatus {
  const sessions = state.sessions.filter((session) => session.assessmentId === assessmentId);
  const reports = state.reports.filter((report) => report.assessmentId === assessmentId);

  if (reports.length > 0 && sessions.every((session) => session.status === "completed")) {
    return "completed";
  }

  if (sessions.some((session) => session.status === "active" || session.status === "pending")) {
    return "active";
  }

  if (sessions.length > 0) {
    return "active";
  }

  return "draft";
}

function syncAssessmentMetrics(state: DomainState, assessmentId: string): void {
  const assessmentIndex = state.assessments.findIndex((assessment) => assessment.id === assessmentId);
  if (assessmentIndex === -1) return;

  const assessment = state.assessments[assessmentIndex];
  const invites = state.invites.filter((invite) => invite.assessmentId === assessmentId);
  const sessions = state.sessions.filter((session) => session.assessmentId === assessmentId);
  const reports = state.reports.filter((report) => report.assessmentId === assessmentId);
  const totalScore = reports.reduce((sum, report) => sum + report.compositeScore, 0);
  const completedReports = reports.length;
  const passCount = reports.filter(
    (report) => report.recommendation === "strong_yes" || report.recommendation === "yes",
  ).length;

  state.assessments[assessmentIndex] = {
    ...assessment,
    status: assessmentStatusFromState(state, assessmentId),
    invitedCount: invites.length,
    startedCount: sessions.filter((session) => session.status !== "pending").length,
    completedCount: sessions.filter((session) => session.status === "completed").length,
    averageScore: completedReports === 0 ? assessment.averageScore : Math.round(totalScore / completedReports),
    passRate:
      completedReports === 0 ? assessment.passRate : Math.round((passCount / completedReports) * 100),
    updatedAt: nowIso(),
  };
}

function syncAssessmentInviteSnapshot(state: DomainState, assessmentId: string): void {
  const assessmentIndex = state.assessments.findIndex((assessment) => assessment.id === assessmentId);
  if (assessmentIndex === -1) return;

  state.assessments[assessmentIndex] = {
    ...state.assessments[assessmentIndex],
    invites: state.invites
      .filter((invite) => invite.assessmentId === assessmentId)
      .map((invite) => ({
        email: invite.email,
        fullName: invite.fullName,
        status: invite.status,
        invitedAt: invite.invitedAt,
        openedAt: invite.openedAt,
        startedAt: invite.startedAt,
        completedAt: invite.completedAt,
        candidateId: invite.candidateId,
        sessionId: invite.sessionId,
      })),
  };
}

function scoreDecisionToRecommendation(decision: ScoreDecision): HiringRecommendation {
  return recommendationFromDecision(decision);
}

function scorecardToReport(scorecard: ScorecardRecord): AssessmentReportRecord {
  const createdAt = scorecard.reviewedAt;
  const proctoringFlags: ProctoringFlagRecord[] = [];

  return {
    id: scorecard.id,
    assessmentId: scorecard.assessmentId,
    sessionId: scorecard.sessionId,
    candidateId: scorecard.candidateId,
    inviteId: null,
    reviewer: scorecard.reviewer,
    createdAt,
    updatedAt: createdAt,
    status: "ready",
    compositeScore: scorecard.totalScore,
    scoreBand: scoreBand(scorecard.totalScore),
    recommendation: scoreDecisionToRecommendation(scorecard.decision),
    summary: scorecard.summary,
    strengths: clone(scorecard.strengths),
    risks: clone(scorecard.risks),
    nextStep: scorecard.nextStep,
    evidence: clone(scorecard.evidence),
    breakdown: buildScoreBreakdown({
      reasoning: scorecard.dimensions.find((dimension) => dimension.dimensionId === "logic")?.score ?? 0,
      correctness: scorecard.dimensions.find((dimension) => dimension.dimensionId === "testing")?.score ?? 0,
      codeQuality: scorecard.dimensions.find((dimension) => dimension.dimensionId === "communication")?.score ?? 0,
      speed: scorecard.dimensions.find((dimension) => dimension.dimensionId === "agent_orchestration")?.score ?? 0,
      vibe: scorecard.dimensions.find((dimension) => dimension.dimensionId === "judgment")?.score ?? 0,
    }),
    proctoringFlags,
  };
}

function createInitialState(): DomainState {
  const assessments = clone(mvpSeed.assessments);
  const candidates = clone(mvpSeed.candidates);
  const sessions = clone(mvpSeed.sessions).map((session) => ({
    ...session,
    draft: {
      code: "",
      language: "typescript",
      revision: 0,
      updatedAt: session.createdAt,
    },
    submittedCode: null,
    submittedLanguage: null,
    submittedAt: null,
    updatedAt: session.heartbeatAt ?? session.createdAt,
    codeServerUrl: session.codeServerUrl || DEFAULT_CODE_SERVER_URL,
  }));
  const reports = clone(mvpSeed.scorecards).map((scorecard) => scorecardToReport(scorecard));

  const invites = assessments.flatMap((assessment) =>
    assessment.invites.map((invite, index) => ({
      id: `${assessment.id}-invite-${index + 1}`,
      assessmentId: assessment.id,
      candidateId:
        candidates.find((candidate) => candidate.assessmentId === assessment.id && candidate.email === invite.email)?.id ??
        `${assessment.id}-candidate-${index + 1}`,
      fullName: invite.fullName,
      email: invite.email,
      status: invite.status,
      invitedAt: invite.invitedAt,
      openedAt: invite.openedAt,
      startedAt: invite.startedAt,
      completedAt: invite.completedAt,
      note: "",
      updatedAt: invite.completedAt ?? invite.startedAt ?? invite.openedAt ?? invite.invitedAt,
    })),
  );

  const proctoringFlags: ProctoringFlagRecord[] = [];
  const state: DomainState = {
    version: 1,
    assessments,
    candidates,
    invites,
    sessions,
    reports,
    proctoringFlags,
  };

  for (const assessment of state.assessments) {
    syncAssessmentMetrics(state, assessment.id);
  }

  return state;
}

function getStateSnapshot(storage: StorageLike): DomainState {
  const persisted = parseState(storage.getItem(STORAGE_KEY));
  return persisted ? clone(persisted) : createInitialState();
}

function upsertAssessmentState(
  state: DomainState,
  assessmentId: string,
  updater: (assessment: AssessmentRecord) => AssessmentRecord,
): AssessmentRecord | undefined {
  const index = state.assessments.findIndex((assessment) => assessment.id === assessmentId);
  if (index === -1) return undefined;

  state.assessments[index] = updater(state.assessments[index]);
  syncAssessmentMetrics(state, assessmentId);
  return clone(state.assessments[index]);
}

function findInviteForAssessment(
  state: DomainState,
  assessmentId: string,
  email: string,
): AssessmentInviteRecord | undefined {
  return state.invites.find(
    (invite) => invite.assessmentId === assessmentId && invite.email.toLowerCase() === email.toLowerCase(),
  );
}

function getCandidateByEmail(state: DomainState, assessmentId: string, email: string): CandidateRecord | undefined {
  return state.candidates.find(
    (candidate) => candidate.assessmentId === assessmentId && candidate.email.toLowerCase() === email.toLowerCase(),
  );
}

function getSessionById(state: DomainState, sessionId: string): CandidateSessionRecord | undefined {
  return state.sessions.find((session) => session.id === sessionId);
}

function getReportForSession(state: DomainState, sessionId: string): AssessmentReportRecord | undefined {
  return state.reports.find((report) => report.sessionId === sessionId);
}

/**
 * Creates a mutable localStorage-backed store for recruiter and candidate workflows.
 */
export function createLocalDomainStore(storage?: StorageLike): DomainStore {
  const resolvedStorage = resolveStorage(storage);
  let state = getStateSnapshot(resolvedStorage);

  function commit(nextState: DomainState): DomainState {
    state = clone(nextState);
    persistState(resolvedStorage, state);
    return clone(state);
  }

  function read(): DomainState {
    return clone(state);
  }

  return {
    getState() {
      return read();
    },

    reset() {
      const nextState = createInitialState();
      return commit(nextState);
    },

    listAssessments() {
      return clone(state.assessments);
    },

    getAssessmentById(id: string) {
      const assessment = state.assessments.find((item) => item.id === id);
      return assessment ? clone(assessment) : undefined;
    },

    createAssessment(input: CreateAssessmentInput) {
      const createdAt = nowIso();
      const assessment: AssessmentRecord = {
        id: makeId("assessment"),
        slug: slugify(input.title),
        title: input.title,
        role: input.role,
        team: input.team,
        source: input.source,
        status: "draft",
        mode: input.mode,
        difficulty: input.difficulty,
        templateId: input.templateId,
        owner: input.owner,
        summary: input.summary,
        createdAt,
        updatedAt: createdAt,
        timeLimitMinutes: input.timeLimitMinutes,
        candidateLimit: input.candidateLimit,
        invitedCount: 0,
        startedCount: 0,
        completedCount: 0,
        averageScore: 0,
        passRate: 0,
        tags: clone(input.tags),
        rubricFocus: clone(input.rubricFocus),
        notes: input.notes,
        sharePath: input.sharePath,
        invites: [],
      };

      state.assessments = [assessment, ...state.assessments];
      persistState(resolvedStorage, state);
      return clone(assessment);
    },

    updateAssessment(id: string, patch: Partial<AssessmentRecord>) {
      const next = upsertAssessmentState(state, id, (assessment) => ({
        ...assessment,
        ...patch,
      }));

      if (!next) return undefined;
      persistState(resolvedStorage, state);
      return next;
    },

    createCandidate(input: CreateCandidateInput) {
      const existing = getCandidateByEmail(state, input.assessmentId, input.email);
      if (existing) {
        return clone(existing);
      }

      const createdAt = nowIso();
      const assessment = state.assessments.find((item) => item.id === input.assessmentId);
      const candidate: CandidateRecord = {
        id: makeId("candidate"),
        assessmentId: input.assessmentId,
        fullName: input.fullName,
        email: input.email,
        headline: input.headline,
        company: input.company,
        title: input.title,
        location: input.location,
        status: "invited",
        experienceYears: 0,
        invitedAt: createdAt,
        agentToolPreference: clone(input.agentToolPreference),
        summary: input.summary,
        strengths: [],
        risks: [],
      };

      if (assessment) {
        state.candidates = [candidate, ...state.candidates];
        persistState(resolvedStorage, state);
      }

      return clone(candidate);
    },

    createInvite(input: CreateInviteInput) {
      const assessment = state.assessments.find((item) => item.id === input.assessmentId);
      if (!assessment) return undefined;

      const candidate = getCandidateByEmail(state, input.assessmentId, input.email);
      const candidateId = candidate?.id ?? makeId("candidate");
      if (!candidate) {
        state.candidates = [
          {
            id: candidateId,
            assessmentId: input.assessmentId,
            fullName: input.fullName,
            email: input.email,
            headline: "Invited candidate",
            company: assessment.team,
            title: assessment.role,
            location: "Remote",
            status: "invited",
            experienceYears: 0,
            invitedAt: nowIso(),
            agentToolPreference: ["claude", "terminal", "browser"],
            summary: input.note,
            strengths: [],
            risks: [],
          },
          ...state.candidates,
        ];
      }

      const invite: AssessmentInviteRecord = {
        id: makeId("invite"),
        assessmentId: input.assessmentId,
        candidateId,
        fullName: input.fullName,
        email: input.email,
        status: "sent",
        invitedAt: nowIso(),
        note: input.note,
        updatedAt: nowIso(),
      };

      state.invites = [invite, ...state.invites];
      syncAssessmentInviteSnapshot(state, assessment.id);
      syncAssessmentMetrics(state, assessment.id);
      persistState(resolvedStorage, state);
      return clone(invite);
    },

    listInvites(assessmentId?: string) {
      return assessmentId
        ? clone(state.invites.filter((invite) => invite.assessmentId === assessmentId))
        : clone(state.invites);
    },

    startSession(input: StartSessionInput) {
      const assessment = state.assessments.find((item) => item.id === input.assessmentId);
      const candidate = state.candidates.find((item) => item.id === input.candidateId);
      if (!assessment || !candidate) return undefined;

      const createdAt = nowIso();
      const session: CandidateSessionRecord = {
        id: makeId("session"),
        assessmentId: input.assessmentId,
        candidateId: input.candidateId,
        status: "active",
        createdAt,
        startedAt: createdAt,
        endedAt: undefined,
        expiresAt: new Date(Date.now() + assessment.timeLimitMinutes * 60 * 1000).toISOString(),
        timeLimitMinutes: assessment.timeLimitMinutes,
        currentQuestionIndex: 0,
        codeServerUrl: input.codeServerUrl ?? DEFAULT_CODE_SERVER_URL,
        workspaceLabel: input.workspaceLabel ?? DEFAULT_WORKSPACE_LABEL,
        stopReason: undefined,
        heartbeatAt: createdAt,
        events: [
          {
            at: createdAt,
            label: "session_started",
            detail: `Started assessment ${assessment.title}`,
          },
        ],
        draft: {
          code: "",
          language: "typescript",
          revision: 0,
          updatedAt: createdAt,
        },
        submittedCode: null,
        submittedLanguage: null,
        submittedAt: null,
        updatedAt: createdAt,
      };

      state.sessions = [session, ...state.sessions];
      state.candidates = state.candidates.map((item) =>
        item.id === candidate.id
          ? {
              ...item,
              status: "in_progress",
              sessionId: session.id,
              startedAt: createdAt,
              lastSeenAt: createdAt,
            }
          : item,
      );
      const invite = findInviteForAssessment(state, input.assessmentId, candidate.email);
      if (invite) {
        invite.status = "started";
        invite.startedAt = createdAt;
        invite.updatedAt = createdAt;
      }
      syncAssessmentInviteSnapshot(state, assessment.id);
      syncAssessmentMetrics(state, assessment.id);
      persistState(resolvedStorage, state);
      return clone(session);
    },

    saveSessionDraft(sessionId: string, input: SaveDraftInput) {
      const session = getSessionById(state, sessionId);
      if (!session) return undefined;

      const updatedAt = nowIso();
      session.draft = {
        code: input.code,
        language: input.language,
        revision: session.draft.revision + 1,
        updatedAt,
      };
      session.updatedAt = updatedAt;
      session.heartbeatAt = updatedAt;
      persistState(resolvedStorage, state);
      return clone(session);
    },

    flagProctoring(input: FlagProctoringInput) {
      const session = getSessionById(state, input.sessionId);
      if (!session) return undefined;

      const flag: ProctoringFlagRecord = {
        id: makeId("flag"),
        sessionId: session.id,
        assessmentId: session.assessmentId,
        candidateId: session.candidateId,
        type: input.type,
        severity: input.severity ?? "medium",
        message: input.message,
        createdAt: nowIso(),
        acknowledged: false,
      };

      state.proctoringFlags = [flag, ...state.proctoringFlags];
      persistState(resolvedStorage, state);
      return clone(flag);
    },

    submitSession(input: SubmitSessionInput) {
      const session = getSessionById(state, input.sessionId);
      if (!session) return undefined;

      const submittedAt = nowIso();
      const breakdown = buildScoreBreakdown({
        reasoning: input.reasoning,
        correctness: input.correctness,
        codeQuality: input.codeQuality,
        speed: input.speed,
        vibe: input.vibe,
      });
      const composite = compositeScore({
        reasoning: input.reasoning,
        correctness: input.correctness,
        codeQuality: input.codeQuality,
        speed: input.speed,
        vibe: input.vibe,
      });
      const report: AssessmentReportRecord = {
        id: makeId("report"),
        assessmentId: session.assessmentId,
        sessionId: session.id,
        candidateId: session.candidateId,
        inviteId: state.invites.find(
          (invite) => invite.assessmentId === session.assessmentId && invite.candidateId === session.candidateId,
        )?.id ?? null,
        reviewer: input.reviewer,
        createdAt: submittedAt,
        updatedAt: submittedAt,
        status: "ready",
        compositeScore: composite,
        scoreBand: scoreBand(composite),
        recommendation: hiringRecommendationFromScore(composite),
        summary: input.summary,
        strengths: clone(input.strengths),
        risks: clone(input.risks),
        nextStep: input.nextStep,
        evidence: clone(input.evidence),
        breakdown,
        proctoringFlags: state.proctoringFlags.filter((flag) => flag.sessionId === session.id),
      };

      session.status = "completed";
      session.endedAt = submittedAt;
      session.stopReason = "submitted";
      session.submittedCode = session.draft.code;
      session.submittedLanguage = session.draft.language;
      session.submittedAt = submittedAt;
      session.updatedAt = submittedAt;

      state.reports = [report, ...state.reports.filter((existing) => existing.sessionId !== session.id)];
      state.candidates = state.candidates.map((candidate) =>
        candidate.id === session.candidateId
          ? {
              ...candidate,
              status: "reviewed",
              sessionId: session.id,
              scorecardId: report.id,
              completedAt: submittedAt,
              lastSeenAt: submittedAt,
            }
          : candidate,
      );

      const invite = state.invites.find((item) => item.assessmentId === session.assessmentId && item.candidateId === session.candidateId);
      if (invite) {
        invite.status = "completed";
        invite.completedAt = submittedAt;
        invite.updatedAt = submittedAt;
      }

      syncAssessmentInviteSnapshot(state, session.assessmentId);
      syncAssessmentMetrics(state, session.assessmentId);
      persistState(resolvedStorage, state);
      return clone(report);
    },

    listReports(assessmentId?: string) {
      return assessmentId
        ? clone(state.reports.filter((report) => report.assessmentId === assessmentId))
        : clone(state.reports);
    },

    getReportBySessionId(sessionId: string) {
      const report = getReportForSession(state, sessionId);
      return report ? clone(report) : undefined;
    },

    getCandidateReportView(sessionId: string) {
      const session = getSessionById(state, sessionId);
      if (!session) return undefined;

      const assessment = state.assessments.find((item) => item.id === session.assessmentId);
      const candidate = state.candidates.find((item) => item.id === session.candidateId);
      if (!assessment || !candidate) return undefined;

      const report = getReportForSession(state, sessionId);
      const proctoringFlags = state.proctoringFlags.filter((flag) => flag.sessionId === sessionId);

      return {
        assessment: clone(assessment),
        candidate: clone(candidate),
        session: clone(session),
        report: report ? clone(report) : undefined,
        proctoringFlags: clone(proctoringFlags),
      };
    },

    getRecruiterSummary() {
      const totalCandidates = state.candidates.length;
      const completedReports = state.reports.filter((report) => report.status === "ready");
      const totalScore = completedReports.reduce((sum, report) => sum + report.compositeScore, 0);
      const passRate =
        completedReports.length === 0
          ? 0
          : Math.round(
              (completedReports.filter(
                (report) => report.recommendation === "strong_yes" || report.recommendation === "yes",
              ).length /
                completedReports.length) *
                100,
            );

      return {
        activeAssessments: state.assessments.filter((assessment) => assessment.status === "active").length,
        draftAssessments: state.assessments.filter((assessment) => assessment.status === "draft").length,
        completedAssessments: state.assessments.filter((assessment) => assessment.status === "completed").length,
        totalCandidates,
        sessionsRunning: state.sessions.filter((session) => session.status === "active").length,
        needsReview: state.sessions.filter((session) => session.status === "completed" && !getReportForSession(state, session.id)).length,
        averageScore: completedReports.length === 0 ? 0 : Math.round(totalScore / completedReports.length),
        passRate,
      };
    },
  };
}

/**
 * Creates a memory-backed storage shim for tests.
 */
export function createMemoryStorage(seed?: Record<string, string>): StorageLike {
  const entries = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    getItem(key: string) {
      return entries.has(key) ? entries.get(key) ?? null : null;
    },
    setItem(key: string, value: string) {
      entries.set(key, value);
    },
    removeItem(key: string) {
      entries.delete(key);
    },
  };
}

/**
 * Returns the current seeded state without mutating any storage.
 */
export function createInitialDomainState(): DomainState {
  return createInitialState();
}

/**
 * Returns a recruiter dashboard summary from an arbitrary state snapshot.
 */
export function buildRecruiterSummary(state: DomainState): RecruiterDashboardSummary {
  const store = createLocalDomainStore(createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(state) }));
  return store.getRecruiterSummary();
}

/**
 * Returns the candidate report view for a session from an arbitrary state snapshot.
 */
export function buildCandidateReportView(
  state: DomainState,
  sessionId: string,
): CandidateReportView | undefined {
  const store = createLocalDomainStore(createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(state) }));
  return store.getCandidateReportView(sessionId);
}
