/**
 * MCP Schema: Compliance Results
 * 
 * Defines structured outputs for compliance analysis, scoring, and fixes.
 * Ensures deterministic, explainable results from BrandGuard AI tools.
 */

import { Violation, ComplianceScore, Domain, Severity } from "../../../types";

export interface ComplianceAnalysisResult {
  /** List of detected violations */
  violations: Violation[];
  
  /** Explanation of the analysis */
  summary: {
    totalViolations: number;
    byDomain: {
      visual: number;
      content: number;
    };
    bySeverity: {
      critical: number;
      warning: number;
    };
  };
  
  /** Metadata about the analysis */
  metadata: {
    analyzedElements: number;
    analysisTimestamp: string;
  };
}

export interface ComplianceScoreResult {
  /** Calculated compliance score */
  score: ComplianceScore;
  
  /** Breakdown of scoring */
  breakdown: {
    visual: {
      score: number;
      violations: number;
      deduction: number;
    };
    content: {
      score: number;
      violations: number;
      deduction: number;
    };
    total: {
      score: number;
      weights: {
        visual: number;
        content: number;
      };
    };
  };
  
  /** Interpretation of the score */
  interpretation: {
    level: "excellent" | "good" | "fair" | "poor" | "critical";
    message: string;
  };
}

export interface FixInstruction {
  /** Element ID to fix */
  elementId: string;
  
  /** Type of fix to apply */
  fixType: "color" | "font" | "logo_size" | "content";
  
  /** Current value */
  currentValue: string;
  
  /** Suggested value */
  suggestedValue: string;
  
  /** Properties to update */
  updates: Record<string, any>;
}

export interface ApplyFixesResult {
  /** List of fix instructions */
  fixes: FixInstruction[];
  
  /** Updated compliance score after fixes */
  projectedScore: ComplianceScore;
  
  /** Summary of changes */
  summary: {
    totalFixes: number;
    autoFixable: number;
    manualReview: number;
  };
}

