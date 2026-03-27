import {
  buildCandidateReportView,
  buildRecruiterSummary,
  createInitialDomainState,
  createLocalDomainStore,
  createMemoryStorage,
} from "@/lib/domain-store";

describe("domain store", () => {
  it("creates, persists, and restores recruiter workflow state", () => {
    const storage = createMemoryStorage();
    const store = createLocalDomainStore(storage);
    const initialCount = store.listAssessments().length;

    const assessment = store.createAssessment({
      title: "Agentic Systems Engineer",
      role: "Senior Engineer",
      team: "Platform",
      source: "generated",
      mode: "agent-native",
      difficulty: "hard",
      templateId: "agent-support-triage",
      owner: "recruiter@example.com",
      summary: "Assess how candidates use agents without losing judgment.",
      timeLimitMinutes: 75,
      candidateLimit: 12,
      tags: ["agents", "platform"],
      rubricFocus: ["logic", "judgment", "testing"],
      notes: "No trivia. Strong focus on verification.",
      sharePath: "/take/demo",
    });

    const invite = store.createInvite({
      assessmentId: assessment.id,
      fullName: "Ada Candidate",
      email: "ada@example.com",
      note: "Use any tools you want, but show your reasoning.",
    });

    expect(store.listAssessments()).toHaveLength(initialCount + 1);
    expect(invite?.status).toBe("sent");

    const rehydrated = createLocalDomainStore(storage);
    expect(rehydrated.getAssessmentById(assessment.id)?.title).toBe("Agentic Systems Engineer");
    expect(rehydrated.listInvites(assessment.id)).toHaveLength(1);
  });

  it("tracks sessions, proctoring flags, and reports end to end", () => {
    const store = createLocalDomainStore(createMemoryStorage());
    const assessment = store.listAssessments()[0];
    const candidate = store.createCandidate({
      assessmentId: assessment.id,
      fullName: "Grace Hopper",
      email: "grace@example.com",
      headline: "Staff engineer",
      company: "DemoCo",
      title: "Staff Engineer",
      location: "Remote",
      agentToolPreference: ["claude", "terminal"],
      summary: "Strong distributed systems background.",
    });

    const session = store.startSession({
      assessmentId: assessment.id,
      candidateId: candidate.id,
      codeServerUrl: "about:blank",
      workspaceLabel: "Candidate workspace",
    });

    expect(session?.status).toBe("active");

    const draft = store.saveSessionDraft(session?.id ?? "", {
      code: "export const answer = 42;",
      language: "typescript",
    });

    expect(draft?.draft.revision).toBe(1);

    const flag = store.flagProctoring({
      sessionId: session?.id ?? "",
      type: "tab-switch",
      message: "Candidate switched tabs once",
      severity: "low",
    });

    expect(flag?.type).toBe("tab-switch");

    const report = store.submitSession({
      sessionId: session?.id ?? "",
      reviewer: "reviewer@demo.co",
      reasoning: 8,
      correctness: 9,
      codeQuality: 7,
      speed: 6,
      vibe: 5,
      summary: "Strong reasoning with a small amount of proctoring noise.",
      strengths: ["Clear decomposition", "Good verification"],
      risks: ["Could streamline prompt iteration"],
      nextStep: "Advance to live interview",
      evidence: ["Verified tests", "Explained tradeoffs"],
    });

    expect(report?.status).toBe("ready");
    expect(report?.compositeScore).toBeGreaterThan(0);
    expect(store.getReportBySessionId(session?.id ?? "")?.sessionId).toBe(session?.id);

    const reportView = store.getCandidateReportView(session?.id ?? "");
    expect(reportView?.report?.recommendation).toBeDefined();
    expect(reportView?.proctoringFlags).toHaveLength(1);

    const recruiterSummary = buildRecruiterSummary(store.getState());
    expect(recruiterSummary.totalCandidates).toBeGreaterThan(0);
  });

  it("can build a candidate report view from a plain state snapshot", () => {
    const state = createInitialDomainState();
    const view = buildCandidateReportView(state, state.sessions[0].id);
    expect(view?.session.id).toBe(state.sessions[0].id);
    expect(view?.assessment.id).toBe(state.sessions[0].assessmentId);
  });
});
