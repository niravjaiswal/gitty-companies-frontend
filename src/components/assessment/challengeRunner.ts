export interface TicketInput {
  issue: string;
  confidence: number;
  complianceRisk: boolean;
  customerTier: "free" | "pro" | "enterprise";
  sentiment: "calm" | "neutral" | "angry";
  hasContext?: boolean;
}

export interface RouteResult {
  route: "auto-resolve" | "research" | "escalate";
  owner: string;
  note: string;
  confidence: number;
}

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

export interface ExecutionResult {
  results: TestResult[];
  stdout: string[];
  stderr: string[];
  passedCount: number;
  failedCount: number;
  runtimeError?: string;
}

interface CompiledModule {
  routeTicket: (ticket: TicketInput) => unknown;
}

const TEST_CASES: Array<{ name: string; input: TicketInput; expectedRoute: RouteResult["route"] }> = [
  {
    name: "Auto-resolve safe, high-confidence issues",
    input: {
      issue: "Password reset status page is blank",
      confidence: 0.97,
      complianceRisk: false,
      customerTier: "free",
      sentiment: "calm",
      hasContext: true,
    },
    expectedRoute: "auto-resolve",
  },
  {
    name: "Research ambiguous issues before answering",
    input: {
      issue: "Billing line item looks wrong, but the screenshot is incomplete",
      confidence: 0.64,
      complianceRisk: false,
      customerTier: "pro",
      sentiment: "neutral",
      hasContext: false,
    },
    expectedRoute: "research",
  },
  {
    name: "Escalate risky enterprise incidents",
    input: {
      issue: "Enterprise tenant cannot access customer data export",
      confidence: 0.88,
      complianceRisk: true,
      customerTier: "enterprise",
      sentiment: "angry",
      hasContext: true,
    },
    expectedRoute: "escalate",
  },
];

function normalizeExportedCode(code: string): string {
  return code
    .replace(/export\s+default\s+/g, "")
    .replace(/export\s+(async\s+function|function|const|let|var|class)\s+/g, "$1 ")
    .replace(/\bexport\s*\{[^}]*\};?/g, "");
}

function compileModule(code: string): CompiledModule {
  const normalizedCode = normalizeExportedCode(code);
  const factory = new Function(
    "console",
    `${normalizedCode}\nreturn { routeTicket: typeof routeTicket === 'function' ? routeTicket : undefined };`,
  );

  const consoleProxy = {
    log: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    info: () => undefined,
  };

  const module = factory(consoleProxy) as Partial<CompiledModule>;
  if (typeof module.routeTicket !== "function") {
    throw new Error("Your submission must export a routeTicket function.");
  }

  return module as CompiledModule;
}

function normalizeRouteResult(result: unknown): RouteResult {
  if (typeof result === "string") {
    const route = result as RouteResult["route"];
    return {
      route: route === "auto-resolve" || route === "research" || route === "escalate" ? route : "research",
      owner: route === "escalate" ? "human reviewer" : "automation",
      note: result,
      confidence: 0.5,
    };
  }

  if (typeof result === "object" && result) {
    const typed = result as Partial<RouteResult> & { action?: string };
    const route =
      typed.route === "auto-resolve" || typed.route === "research" || typed.route === "escalate"
        ? typed.route
        : typed.action === "auto-resolve" || typed.action === "research" || typed.action === "escalate"
          ? typed.action
          : "research";

    return {
      route,
      owner: typeof typed.owner === "string" ? typed.owner : route === "escalate" ? "human reviewer" : "triage bot",
      note: typeof typed.note === "string" ? typed.note : "No note provided.",
      confidence: typeof typed.confidence === "number" ? typed.confidence : 0.5,
    };
  }

  return {
    route: "research",
    owner: "triage bot",
    note: "The function returned an unsupported value.",
    confidence: 0.25,
  };
}

/**
 * Evaluate the candidate's exported routeTicket function against the seeded cases.
 */
export function runChallengeTests(code: string): ExecutionResult {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const results: TestResult[] = [];

  let routeTicket: CompiledModule["routeTicket"] | null = null;
  try {
    routeTicket = compileModule(code).routeTicket;
  } catch (error) {
    return {
      results: TEST_CASES.map((testCase) => ({
        name: testCase.name,
        passed: false,
        message: error instanceof Error ? error.message : "Unable to compile submission.",
        durationMs: 0,
      })),
      stdout,
      stderr: [error instanceof Error ? error.message : "Unable to compile submission."],
      passedCount: 0,
      failedCount: TEST_CASES.length,
      runtimeError: error instanceof Error ? error.message : "Unable to compile submission.",
    };
  }

  for (const testCase of TEST_CASES) {
    const started = performance.now();
    try {
      const value = routeTicket(testCase.input);
      const normalized = normalizeRouteResult(value);
      const passed = normalized.route === testCase.expectedRoute;

      results.push({
        name: testCase.name,
        passed,
        message: passed
          ? `Expected ${testCase.expectedRoute}, got ${normalized.route}.`
          : `Expected ${testCase.expectedRoute}, got ${normalized.route}.`,
        durationMs: Math.max(0, Math.round(performance.now() - started)),
      });

      stdout.push(
        `${testCase.name}: ${passed ? "passed" : "failed"} (${normalized.route}, confidence ${Math.round(normalized.confidence * 100)}%)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Runtime failure.";
      results.push({
        name: testCase.name,
        passed: false,
        message,
        durationMs: Math.max(0, Math.round(performance.now() - started)),
      });
      stderr.push(message);
    }
  }

  const passedCount = results.filter((result) => result.passed).length;

  return {
    results,
    stdout,
    stderr,
    passedCount,
    failedCount: results.length - passedCount,
  };
}

export function getDefaultChallengeCases(): Array<{ name: string; summary: string }> {
  return TEST_CASES.map((testCase) => ({
    name: testCase.name,
    summary: `${testCase.input.issue} -> ${testCase.expectedRoute}`,
  }));
}

