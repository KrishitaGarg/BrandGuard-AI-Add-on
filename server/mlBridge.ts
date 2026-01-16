/**
 * ML Bridge: Integration Layer
 * 
 * Lightweight bridge between compliance engine and optional ML models.
 * All ML calls are guarded by feature flag and fail-safe.
 * 
 * This layer ensures:
 * - ML is completely optional
 * - No errors propagate from ML layer
 * - ML output is merged as metadata only (never overwrites rule-based results)
 */

import {
  classifyViolations,
  ViolationMLPrediction,
  ViolationClassifierInput,
} from "../ml-models/backend/violationClassifier";
import {
  scoreComplianceWithML,
  ComplianceMLScore,
  ComplianceScorerInput,
} from "../ml-models/backend/complianceScorer";
import {
  recommendFixes,
  FixRecommendation,
  FixRecommenderInput,
} from "../ml-models/backend/fixRecommender";
import { Violation, ComplianceScore, Layer, BrandProfile } from "../types";

/**
 * ML Bridge Result Wrapper
 * 
 * All ML results are wrapped to indicate availability and status.
 */
export interface MLBridgeResult<T> {
  /** Whether ML is enabled and available */
  available: boolean;
  
  /** ML prediction result (null if unavailable or disabled) */
  prediction: T | null;
  
  /** Error message if ML failed (null if successful) */
  error: string | null;
}

/**
 * Requests ML violation classification
 * 
 * @returns ML predictions or null if disabled/unavailable
 */
export function requestMLViolationClassification(
  violations: Violation[],
  layers: Layer[],
  brandProfile: BrandProfile
): MLBridgeResult<ViolationMLPrediction> {
  try {
    // Feature flag guard
    if (process.env.ENABLE_ML !== "true") {
      return {
        available: false,
        prediction: null,
        error: null,
      };
    }

    const input: ViolationClassifierInput = {
      violations,
      layers,
      brandProfile: {
        visualRules: brandProfile.visualRules,
        contentRules: brandProfile.contentRules,
      },
    };

    const prediction = classifyViolations(input);

    return {
      available: true,
      prediction,
      error: null,
    };
  } catch (error: any) {
    // Fail-safe: never throw, always return graceful result
    return {
      available: false,
      prediction: null,
      error: error?.message || "ML classification failed",
    };
  }
}

/**
 * Requests ML compliance scoring enhancement
 * 
 * @returns ML score predictions or null if disabled/unavailable
 */
export function requestMLComplianceScoring(
  violations: Violation[],
  baseScore: ComplianceScore,
  totalElements: number,
  layers: Layer[]
): MLBridgeResult<ComplianceMLScore> {
  try {
    // Feature flag guard
    if (process.env.ENABLE_ML !== "true") {
      return {
        available: false,
        prediction: null,
        error: null,
      };
    }

    const input: ComplianceScorerInput = {
      violations,
      baseScore,
      totalElements,
      layers,
    };

    const prediction = scoreComplianceWithML(input);

    return {
      available: true,
      prediction,
      error: null,
    };
  } catch (error: any) {
    // Fail-safe: never throw, always return graceful result
    return {
      available: false,
      prediction: null,
      error: error?.message || "ML scoring failed",
    };
  }
}

/**
 * Requests ML fix recommendations
 * 
 * @returns ML recommendations or null if disabled/unavailable
 */
export function requestMLFixRecommendations(
  violations: Violation[],
  fixes: Array<{
    elementId: string;
    fixType: string;
    currentValue: string;
    suggestedValue: string;
  }>,
  baseScore: ComplianceScore
): MLBridgeResult<FixRecommendation> {
  try {
    // Feature flag guard
    if (process.env.ENABLE_ML !== "true") {
      return {
        available: false,
        prediction: null,
        error: null,
      };
    }

    const input: FixRecommenderInput = {
      violations,
      fixes,
      baseScore,
    };

    const prediction = recommendFixes(input);

    return {
      available: true,
      prediction,
      error: null,
    };
  } catch (error: any) {
    // Fail-safe: never throw, always return graceful result
    return {
      available: false,
      prediction: null,
      error: error?.message || "ML recommendation failed",
    };
  }
}

/**
 * Checks if ML is enabled
 */
export function isMLEnabled(): boolean {
  return process.env.ENABLE_ML === "true";
}
