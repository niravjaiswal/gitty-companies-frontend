import { describe, expect, it } from "vitest";
import { evaluateSubmission, inspectCode } from "./scoring";

describe("assessment scoring", () => {
  it("detects code signals", () => {
    const signals = inspectCode(`export function routeTicket(ticket) {
  // TODO: add guard rails
  if (!ticket) return "research";
  console.log(ticket.issue);
}`);

    expect(signals.functionCount).toBe(1);
    expect(signals.todoCount).toBe(1);
    expect(signals.consoleCount).toBe(1);
    expect(signals.guardClauseCount).toBe(1);
  });

  it("produces a weighted score", () => {
    const report = evaluateSubmission("export function routeTicket(ticket) { return 'research'; }", {
      correctness: 80,
      elapsedSeconds: 120,
      timeLimitSeconds: 3600,
      hintCount: 0,
      proctorWarnings: 0,
      runCount: 1,
      codeSignals: {
        lineCount: 4,
        functionCount: 1,
        commentCount: 0,
        todoCount: 0,
        consoleCount: 0,
        guardClauseCount: 0,
        branchingCount: 0,
        hasDescriptiveNames: true,
        hasTests: false,
      },
    });

    expect(report.overallScore).toBeGreaterThan(0);
    expect(report.hiringRecommendation).toMatch(/yes|maybe|no|strong yes|strong no/);
  });
});

