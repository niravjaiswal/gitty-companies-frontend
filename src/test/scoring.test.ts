import {
  buildScoreBreakdown,
  clampScore,
  compositeScore,
  hiringRecommendationFromScore,
  normalizeScore,
  scoreBand,
} from "@/lib/scoring";

describe("scoring utilities", () => {
  it("clamps and normalizes raw component scores", () => {
    expect(clampScore(14)).toBe(10);
    expect(clampScore(-4)).toBe(0);
    expect(normalizeScore(5)).toBe(50);
  });

  it("computes a weighted composite score on a 0-100 scale", () => {
    const score = compositeScore({
      reasoning: 10,
      correctness: 10,
      codeQuality: 10,
      speed: 10,
      vibe: 10,
    });

    expect(score).toBe(100);
  });

  it("returns a complete score breakdown", () => {
    const breakdown = buildScoreBreakdown({
      reasoning: 8,
      correctness: 9,
      codeQuality: 7,
      speed: 6,
      vibe: 5,
    });

    expect(breakdown.composite).toBeGreaterThan(0);
    expect(breakdown.reasoning).toBeCloseTo(24);
    expect(breakdown.correctness).toBeCloseTo(27);
  });

  it("maps score bands and hiring recommendations", () => {
    expect(scoreBand(92)).toBe("exceptional");
    expect(scoreBand(73)).toBe("pass");
    expect(hiringRecommendationFromScore(91)).toBe("strong_yes");
    expect(hiringRecommendationFromScore(65)).toBe("no");
  });
});
