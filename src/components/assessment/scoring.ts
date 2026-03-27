export type HiringRecommendation = "strong yes" | "yes" | "maybe" | "no" | "strong no";

export interface CodeSignals {
  lineCount: number;
  functionCount: number;
  commentCount: number;
  todoCount: number;
  consoleCount: number;
  guardClauseCount: number;
  branchingCount: number;
  hasDescriptiveNames: boolean;
  hasTests: boolean;
}

export interface SubmissionSignals {
  correctness: number;
  elapsedSeconds: number;
  timeLimitSeconds: number;
  hintCount: number;
  proctorWarnings: number;
  runCount: number;
  codeSignals: CodeSignals;
}

export interface ScoreBreakdown {
  reasoning: number;
  correctness: number;
  codeQuality: number;
  vibecheck: number;
  speed: number;
  overallScore: number;
  hiringRecommendation: HiringRecommendation;
  summary: string;
  strengths: string[];
  risks: string[];
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value);
}

/**
 * Inspect a submission and produce lightweight quality signals.
 */
export function inspectCode(code: string): CodeSignals {
  const lines = code
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const functionCount = (code.match(/\bfunction\b/g) ?? []).length;
  const commentCount = (code.match(/(^|\s)\/\//g) ?? []).length + (code.match(/\/\*[\s\S]*?\*\//g) ?? []).length;
  const todoCount = (code.match(/\bTODO\b/gi) ?? []).length;
  const consoleCount = (code.match(/\bconsole\.(log|warn|error|info)\b/g) ?? []).length;
  const guardClauseCount = (code.match(/\bif\s*\(/g) ?? []).length;
  const branchingCount = (code.match(/\b(if|else if|switch|case)\b/g) ?? []).length;
  const hasDescriptiveNames = /routeTicket|ticket|confidence|escalate|research|resolve/i.test(code);
  const hasTests = /\b(describe|it|test)\s*\(/.test(code);

  return {
    lineCount: lines.length,
    functionCount,
    commentCount,
    todoCount,
    consoleCount,
    guardClauseCount,
    branchingCount,
    hasDescriptiveNames,
    hasTests,
  };
}

/**
 * Convert individual score dimensions into a weighted overall score.
 */
export function calculateCompositeScore(scores: {
  reasoning: number;
  correctness: number;
  codeQuality: number;
  vibecheck: number;
  speed: number;
}): number {
  const weights = {
    reasoning: 0.3,
    correctness: 0.3,
    codeQuality: 0.25,
    vibecheck: 0.1,
    speed: 0.05,
  } as const;

  const overall =
    scores.reasoning * weights.reasoning +
    scores.correctness * weights.correctness +
    scores.codeQuality * weights.codeQuality +
    scores.vibecheck * weights.vibecheck +
    scores.speed * weights.speed;

  return round(clamp(overall));
}

/**
 * Score a submission using correctness, code signals, elapsed time, and proctoring.
 */
export function evaluateSubmission(_code: string, signals: SubmissionSignals): ScoreBreakdown {
  const codeSignals = signals.codeSignals;
  const correctness = clamp(signals.correctness);

  const reasoning = clamp(
    48 +
      codeSignals.guardClauseCount * 5 +
      (codeSignals.hasTests ? 7 : 0) +
      (codeSignals.commentCount > 0 ? 4 : 0) -
      codeSignals.todoCount * 14 -
      signals.hintCount * 6 -
      signals.proctorWarnings * 5,
  );

  const codeQuality = clamp(
    55 +
      (codeSignals.lineCount > 20 ? 6 : 0) +
      (codeSignals.hasDescriptiveNames ? 10 : -8) +
      (codeSignals.functionCount > 0 ? 6 : -10) -
      codeSignals.consoleCount * 4 -
      codeSignals.todoCount * 12,
  );

  const vibecheck = clamp(
    60 +
      (codeSignals.hasDescriptiveNames ? 10 : -6) +
      (codeSignals.hasTests ? 6 : 0) +
      (codeSignals.branchingCount > 0 ? 4 : -4) -
      codeSignals.consoleCount * 3 -
      signals.proctorWarnings * 4,
  );

  const elapsedRatio = signals.timeLimitSeconds > 0 ? signals.elapsedSeconds / signals.timeLimitSeconds : 1;
  const speed = clamp(100 - elapsedRatio * 55 - Math.max(0, signals.runCount - 1) * 4 - signals.hintCount * 3);

  const overallScore = calculateCompositeScore({
    reasoning,
    correctness,
    codeQuality,
    vibecheck,
    speed,
  });

  const recommendation: HiringRecommendation =
    overallScore >= 85
      ? "strong yes"
      : overallScore >= 75
        ? "yes"
        : overallScore >= 60
          ? "maybe"
          : overallScore >= 45
            ? "no"
            : "strong no";

  const strengths = [
    correctness >= 80 ? "Found the core behavior quickly" : "Made meaningful progress on the contract",
    codeSignals.guardClauseCount > 0 ? "Used guard clauses to keep the branching readable" : "The control flow is still easy to follow",
    codeSignals.hasTests ? "Wrote or preserved test-oriented structure" : "Left a clear path for tests",
  ];

  const risks = [
    codeSignals.todoCount > 0 ? "TODO markers are still present" : "Could tighten the final polish",
    signals.hintCount > 1 ? "Needed multiple nudges to stay on contract" : "Could document assumptions a bit more",
    signals.proctorWarnings > 0 ? "Proctor warnings should be acknowledged in the final write-up" : "No proctor issues showed up",
  ];

  const summary = `The submission finished with ${correctness}% test correctness and an overall score of ${overallScore}. The strongest signal is ${recommendation === "strong yes" || recommendation === "yes" ? "the ability to keep the solution on contract" : "the candidate's ability to keep the workflow readable"} while the main gap is ${signals.hintCount > 0 ? "over-reliance on hints" : "room for sharper validation"}.`;

  return {
    reasoning,
    correctness,
    codeQuality,
    vibecheck,
    speed,
    overallScore,
    hiringRecommendation: recommendation,
    summary,
    strengths,
    risks,
  };
}
