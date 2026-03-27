import type { ScoreDecision } from "./mvp-data";

export interface ScoreInputs {
  reasoning: number;
  correctness: number;
  codeQuality: number;
  speed: number;
  vibe: number;
}

export interface ScoreWeights {
  reasoning: number;
  correctness: number;
  codeQuality: number;
  speed: number;
  vibe: number;
}

export interface ScoreBreakdown {
  reasoning: number;
  correctness: number;
  codeQuality: number;
  speed: number;
  vibe: number;
  composite: number;
}

export type HiringRecommendation =
  | "strong_yes"
  | "yes"
  | "maybe"
  | "no"
  | "strong_no";

const DEFAULT_WEIGHTS: ScoreWeights = {
  reasoning: 0.3,
  correctness: 0.3,
  codeQuality: 0.25,
  speed: 0.05,
  vibe: 0.1,
};

/**
 * Clamps a numeric score into the provided range.
 */
export function clampScore(value: number, min = 0, max = 10): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Normalizes a raw component score into a 0-100 percentage.
 */
export function normalizeScore(value: number, max = 10): number {
  if (max <= 0) return 0;
  return clampScore((clampScore(value, 0, max) / max) * 100, 0, 100);
}

/**
 * Returns the weighted score breakdown for the platform's scoring model.
 * The returned composite score is on a 0-100 scale.
 */
export function buildScoreBreakdown(
  scores: ScoreInputs,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): ScoreBreakdown {
  const reasoning = normalizeScore(scores.reasoning) * weights.reasoning;
  const correctness = normalizeScore(scores.correctness) * weights.correctness;
  const codeQuality = normalizeScore(scores.codeQuality) * weights.codeQuality;
  const speed = normalizeScore(scores.speed) * weights.speed;
  const vibe = normalizeScore(scores.vibe) * weights.vibe;

  return {
    reasoning,
    correctness,
    codeQuality,
    speed,
    vibe,
    composite: reasoning + correctness + codeQuality + speed + vibe,
  };
}

/**
 * Computes the composite score on a 0-100 scale.
 */
export function compositeScore(
  scores: ScoreInputs,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): number {
  return buildScoreBreakdown(scores, weights).composite;
}

/**
 * Converts a composite score into a recruiter-friendly band label.
 */
export function scoreBand(score: number): string {
  if (score >= 90) return "exceptional";
  if (score >= 80) return "strong";
  if (score >= 70) return "pass";
  if (score >= 60) return "borderline";
  return "reject";
}

/**
 * Converts a composite score into a hiring recommendation.
 */
export function hiringRecommendationFromScore(score: number): HiringRecommendation {
  if (score >= 90) return "strong_yes";
  if (score >= 80) return "yes";
  if (score >= 70) return "maybe";
  if (score >= 60) return "no";
  return "strong_no";
}

/**
 * Maps the seed decision type into the local hiring recommendation type.
 */
export function recommendationFromDecision(decision: ScoreDecision): HiringRecommendation {
  switch (decision) {
    case "strong_yes":
      return "strong_yes";
    case "yes":
      return "yes";
    case "maybe":
      return "maybe";
    case "no":
      return "strong_no";
  }
}
