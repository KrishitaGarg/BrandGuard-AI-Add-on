/**
 * ML Model: Compliance Scorer
 * 
 * Optional ML-based intelligence for enhancing compliance scoring.
 * Returns null if ML is unavailable or disabled - never throws errors.
 */

import { Violation, ComplianceScore } from "../../types";

export interface ComplianceMLScore {
  /** ML-adjusted score prediction */
  predictedScore: ComplianceScore;
  
  /** ML confidence in score prediction (0-1) */
  confidence: number;
  
  /** ML explanation of score adjustment */
  explanation: string;
  
  /** Risk factors ML identified */
  riskFactors: Array<{
    factor: string;
    impact: number; // -100 to 100
    confidence: number;
  }>;
}

export interface ComplianceScorerInput {
  violations: Violation[];
  baseScore: ComplianceScore;
  totalElements: number;
  layers: Array<{
    id: string;
    type: string;
    domain?: "visual" | "content";
  }>;
  weights?: {
    visual: number;
    content: number;
  };
}

/**
 * Enhances compliance scoring with ML predictions.
 * 
 * This is a fail-safe, optional enhancement. Returns null if:
 * - ML model is not loaded
 * - Feature is disabled
 * - Any error occurs
 * 
 * ML scores are suggestions only - baseScore remains authoritative.
 * 
 * @returns ML score predictions or null if unavailable
 */
export function scoreComplianceWithML(
  input: ComplianceScorerInput
): ComplianceMLScore | null {
  try {
    // Guard: ML disabled or unavailable
    if (process.env.ENABLE_ML !== "true") {
      return null;
    }

    // PLACEHOLDER: In production, this would:
    // 1. Load a trained regression model
    // 2. Extract features: violation patterns, element ratios, domain distribution
    // 3. Predict score adjustment based on historical compliance data
    // 4. Calculate confidence intervals
    
    // For demo/hackathon: Simulate ML scoring with heuristics
    // that approximate what ML might learn from training data
    
    const riskFactors: ComplianceMLScore["riskFactors"] = [];
    let adjustment = 0;
    const explanationParts: string[] = [];

    // Pattern: Violation clustering (ML could learn that clustered violations are worse)
    const elementViolations = new Map<string, number>();
    input.violations.forEach((v) => {
      if (v.elementId) {
        elementViolations.set(
          v.elementId,
          (elementViolations.get(v.elementId) || 0) + 1
        );
      }
    });
    
    const maxViolationsPerElement = Math.max(
      ...Array.from(elementViolations.values()),
      0
    );
    if (maxViolationsPerElement >= 3) {
      const impact = -5 * (maxViolationsPerElement - 2);
      riskFactors.push({
        factor: "multiple violations on same element",
        impact,
        confidence: 0.8,
      });
      adjustment += impact;
      explanationParts.push(
        `element-level violation clustering suggests higher risk (${impact} pts)`
      );
    }

    // Pattern: Domain imbalance (ML could learn brand-specific domain importance)
    const visualCount = input.violations.filter(
      (v) => v.domain === "visual"
    ).length;
    const contentCount = input.violations.filter(
      (v) => v.domain === "content"
    ).length;
    
    if (visualCount > contentCount * 2 && input.violations.length > 2) {
      riskFactors.push({
        factor: "visual domain dominance in violations",
        impact: -3,
        confidence: 0.65,
      });
      adjustment += -3;
      explanationParts.push("visual-heavy violation pattern detected");
    }

    // Pattern: Severity distribution (ML could learn that mixed severity is riskier)
    const criticalCount = input.violations.filter(
      (v) => v.severity === "critical"
    ).length;
    const warningCount = input.violations.filter(
      (v) => v.severity === "warning"
    ).length;
    
    if (criticalCount > 0 && warningCount > criticalCount) {
      riskFactors.push({
        factor: "mixed severity pattern may indicate systemic issues",
        impact: -2,
        confidence: 0.6,
      });
      adjustment += -2;
      explanationParts.push("mixed severity pattern identified");
    }

    // If no significant ML insights, return null
    if (riskFactors.length === 0) {
      return null;
    }

    // Clamp adjustment to reasonable bounds
    adjustment = Math.max(-10, Math.min(10, adjustment));

    // Calculate predicted score (baseScore remains authoritative, this is a hint)
    const predictedScore: ComplianceScore = {
      total: Math.max(0, Math.min(100, input.baseScore.total + adjustment)),
      visual: Math.max(
        0,
        Math.min(100, input.baseScore.visual + Math.round(adjustment * 0.65))
      ),
      content: Math.max(
        0,
        Math.min(100, input.baseScore.content + Math.round(adjustment * 0.35))
      ),
    };

    // Average confidence from risk factors
    const avgConfidence =
      riskFactors.reduce((sum, r) => sum + r.confidence, 0) /
      riskFactors.length;

    const explanation =
      explanationParts.length > 0
        ? `ML analysis: ${explanationParts.join("; ")}. Score adjustment: ${adjustment > 0 ? "+" : ""}${adjustment} points.`
        : "ML analysis completed with minimal impact.";

    return {
      predictedScore,
      confidence: avgConfidence,
      explanation,
      riskFactors,
    };
  } catch (error) {
    // Fail-safe: return null on any error
    console.warn("[ML] ComplianceScorer error:", error);
    return null;
  }
}
