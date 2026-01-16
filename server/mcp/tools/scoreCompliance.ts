/**
 * MCP Tool: score_compliance
 * 
 * Calculates a compliance score from violations and scoring weights.
 * Returns structured score breakdown by category.
 */

import { ComplianceScoreResult } from "../schemas/compliance.schema";
import { calculateComplianceScore } from "../../engine/complianceEngine";
import { Violation, ComplianceScore, Domain, Layer } from "../../../types";
import { BrandScoringWeights } from "../schemas/brand.schema";
import { requestMLComplianceScoring } from "../../mlBridge";

export interface ScoreComplianceInput {
  violations: Violation[];
  totalElements: number;
  weights?: BrandScoringWeights;
}

export interface ScoreComplianceOutput {
  result: ComplianceScoreResult;
  metadata: {
    executionTimeMs: number;
    toolVersion: string;
  };
}

/**
 * MCP Tool: score_compliance
 * 
 * Calculates compliance score from violations with optional custom weights.
 */
export function scoreCompliance(
  input: ScoreComplianceInput
): ScoreComplianceOutput {
  const startTime = Date.now();

  const weights = input.weights
    ? {
        visual: input.weights.visual,
        content: input.weights.content,
      }
    : undefined;

  // Calculate base score
  const score = calculateComplianceScore(
    input.violations,
    input.totalElements,
    weights
  );

  // Build breakdown
  const visualViolations = input.violations.filter((v) => v.domain === Domain.VISUAL);
  const contentViolations = input.violations.filter((v) => v.domain === Domain.CONTENT);

  const visualDeduction = Math.min(100, visualViolations.length * 15);
  const contentDeduction = Math.min(100, contentViolations.length * 15);

  const visualWeight = weights?.visual ?? 0.65;
  const contentWeight = weights?.content ?? 0.35;

  const breakdown = {
    visual: {
      score: score.visual,
      violations: visualViolations.length,
      deduction: visualDeduction,
    },
    content: {
      score: score.content,
      violations: contentViolations.length,
      deduction: contentDeduction,
    },
    total: {
      score: score.total,
      weights: {
        visual: visualWeight,
        content: contentWeight,
      },
    },
  };

  // Determine interpretation
  let level: "excellent" | "good" | "fair" | "poor" | "critical";
  let message: string;

  if (score.total >= 90) {
    level = "excellent";
    message = "Design meets all brand compliance standards.";
  } else if (score.total >= 75) {
    level = "good";
    message = "Design is mostly compliant with minor issues to address.";
  } else if (score.total >= 60) {
    level = "fair";
    message = "Design has several compliance issues that should be fixed.";
  } else if (score.total >= 40) {
    level = "poor";
    message = "Design has significant compliance violations requiring attention.";
  } else {
    level = "critical";
    message = "Design has critical compliance violations that must be fixed before publication.";
  }

  const result: ComplianceScoreResult = {
    score,
    breakdown,
    interpretation: {
      level,
      message,
    },
  };

  const executionTime = Date.now() - startTime;

  // Optional ML enhancement (non-authoritative, metadata only)
  // Note: We create a minimal layers array for ML - in production this would come from input
  const mlResult = requestMLComplianceScoring(
    input.violations,
    score,
    input.totalElements,
    [] // Layers not available in this tool - ML will gracefully handle this
  );

  // Build metadata with optional ML info
  const metadata: ScoreComplianceOutput["metadata"] & { ml?: any } = {
    executionTimeMs: executionTime,
    toolVersion: "1.0.0",
  };

  if (mlResult.available && mlResult.prediction) {
    metadata.ml = {
      complianceScoring: {
        predictedScore: mlResult.prediction.predictedScore,
        confidence: mlResult.prediction.confidence,
        explanation: mlResult.prediction.explanation,
        riskFactors: mlResult.prediction.riskFactors,
      },
    };
  }

  return {
    result,
    metadata,
  };
}

