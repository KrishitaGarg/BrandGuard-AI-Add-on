/**
 * MCP Tool: apply_fixes
 * 
 * Generates fix instructions for violations and calculates projected compliance score.
 * Returns structured fix instructions that can be applied to the design.
 */

import { ApplyFixesResult } from "../schemas/compliance.schema";
import { generateFixInstructions, calculateComplianceScore } from "../../engine/complianceEngine";
import { Violation, Layer, ComplianceScore } from "../../../types";
import { requestMLFixRecommendations } from "../../mlBridge";

export interface ApplyFixesInput {
  violations: Violation[];
  design: {
    layers: Layer[];
  };
  weights?: {
    visual: number;
    content: number;
  };
}

export interface ApplyFixesOutput {
  result: ApplyFixesResult;
  metadata: {
    executionTimeMs: number;
    toolVersion: string;
  };
}

/**
 * MCP Tool: apply_fixes
 * 
 * Generates fix instructions and projects updated compliance score.
 */
export function applyFixes(input: ApplyFixesInput): ApplyFixesOutput {
  const startTime = Date.now();

  // Generate fix instructions
  const fixes = generateFixInstructions(input.violations, input.design.layers);

  // Calculate projected score after fixes
  // Assume all auto-fixable violations are fixed
  const remainingViolations = input.violations.filter((v) => !v.autoFixable);
  const projectedScore = calculateComplianceScore(
    remainingViolations,
    input.design.layers.length,
    input.weights
  );

  // Build summary
  const autoFixableCount = input.violations.filter((v) => v.autoFixable).length;
  const manualReviewCount = input.violations.filter((v) => !v.autoFixable).length;

  const result: ApplyFixesResult = {
    fixes: fixes.map((f) => ({
      elementId: f.elementId,
      fixType: f.fixType,
      currentValue: f.currentValue,
      suggestedValue: f.suggestedValue,
      updates: f.updates,
    })),
    projectedScore,
    summary: {
      totalFixes: fixes.length,
      autoFixable: autoFixableCount,
      manualReview: manualReviewCount,
    },
  };

  const executionTime = Date.now() - startTime;

  // Optional ML enhancement (non-authoritative, metadata only)
  const mlResult = requestMLFixRecommendations(
    input.violations,
    fixes,
    projectedScore
  );

  // Build metadata with optional ML info
  const metadata: ApplyFixesOutput["metadata"] & { ml?: any } = {
    executionTimeMs: executionTime,
    toolVersion: "1.0.0",
  };

  if (mlResult.available && mlResult.prediction) {
    metadata.ml = {
      fixRecommendations: {
        prioritizedFixes: mlResult.prediction.prioritizedFixes,
        strategy: mlResult.prediction.strategy,
        confidence: mlResult.prediction.confidence,
        explanation: mlResult.prediction.explanation,
        estimatedImpact: mlResult.prediction.estimatedImpact,
      },
    };
  }

  return {
    result,
    metadata,
  };
}

