/**
 * Frontend ML Service
 *
 * Optional service for reading and displaying ML metadata from MCP responses.
 * This file is FRONTEND-SAFE:
 *  - No environment variables
 *  - No Node.js globals
 *  - No secrets
 *
 * ML is considered "enabled" if metadata is present in the MCP response.
 */

/**
 * ML Metadata extracted from MCP tool responses
 */
export interface MLMetadata {
  violationClassification?: {
    confidence: number;
    suggestedViolations: Array<{
      id: string;
      ruleId: string;
      domain: string;
      severity: string;
      message: string;
      elementId?: string;
      confidence: number;
    }>;
    explanation: string;
  };

  complianceScoring?: {
    predictedScore: {
      total: number;
      visual: number;
      content: number;
    };
    confidence: number;
    explanation: string;
    riskFactors: Array<{
      factor: string;
      impact: number;
      confidence: number;
    }>;
  };

  fixRecommendations?: {
    prioritizedFixes: Array<{
      violationId: string;
      priority: number;
      reason: string;
    }>;
    strategy: "sequential" | "parallel" | "batch-by-domain";
    confidence: number;
    explanation: string;
    estimatedImpact: {
      scoreImprovement: number;
      riskReduction: number;
    };
  };
}

/**
 * Checks if ML metadata exists in an MCP response
 */
export function hasMLMetadata(response: any): boolean {
  return Boolean(response?.metadata?.ml);
}

/**
 * Extracts ML metadata from an MCP response
 *
 * @param response - MCP tool response
 * @returns ML metadata or null if not available
 */
export function extractMLMetadata(response: any): MLMetadata | null {
  return hasMLMetadata(response) ? response.metadata.ml : null;
}

/**
 * Formats ML confidence as a percentage
 */
export function formatMLConfidence(confidence: number): string {
  if (typeof confidence !== "number" || isNaN(confidence)) {
    return "–";
  }
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Builds a user-facing ML insights summary
 */
export function getMLInsightsSummary(metadata: MLMetadata | null): string | null {
  if (!metadata) {
    return null;
  }

  const insights: string[] = [];

  if (metadata.violationClassification) {
    const vc = metadata.violationClassification;
    const count = vc.suggestedViolations.length;

    if (count > 0) {
      insights.push(
        `ML detected ${count} additional potential issue${count > 1 ? "s" : ""} (${formatMLConfidence(
          vc.confidence
        )} confidence)`
      );
    }
  }

  if (metadata.complianceScoring) {
    const cs = metadata.complianceScoring;

    insights.push(
      `ML score prediction: ${cs.predictedScore.total} points (${formatMLConfidence(
        cs.confidence
      )} confidence)`
    );

    if (cs.riskFactors.length > 0) {
      insights.push(
        `${cs.riskFactors.length} risk factor${cs.riskFactors.length > 1 ? "s" : ""} identified`
      );
    }
  }

  if (metadata.fixRecommendations) {
    const fr = metadata.fixRecommendations;

    insights.push(
      `ML recommends ${fr.strategy} fix strategy, estimated ${fr.estimatedImpact.scoreImprovement}pt improvement`
    );
  }

  return insights.length > 0 ? insights.join(". ") : null;
}

/**
 * Determines whether ML is enabled for this response
 *
 * Frontend rule:
 * ML is enabled IF metadata is present.
 */
export function isMLEnabled(response?: any): boolean {
  return hasMLMetadata(response);
}
