/**
 * ML Model: Violation Classifier
 * 
 * Optional ML-based intelligence for classifying and prioritizing violations.
 * Returns null if ML is unavailable or disabled - never throws errors.
 */

import { Violation, Domain, Severity } from "../../types";

export interface ViolationMLPrediction {
  /** ML confidence score (0-1) */
  confidence: number;
  
  /** Additional violations ML detected (non-authoritative suggestions) */
  suggestedViolations: Array<{
    id: string;
    ruleId: string;
    domain: Domain;
    severity: Severity;
    message: string;
    elementId?: string;
    confidence: number;
  }>;
  
  /** ML explanation of predictions */
  explanation: string;
}

export interface ViolationClassifierInput {
  violations: Violation[];
  layers: Array<{
    id: string;
    type: string;
    content?: string;
    fill?: string;
    fontFamily?: string;
  }>;
  brandProfile: {
    visualRules: {
      colors: string[];
      fonts: string[];
    };
    contentRules: {
      tone: string;
      forbiddenPhrases: string[];
    };
  };
}

/**
 * Classifies violations and suggests additional potential issues using ML.
 * 
 * This is a fail-safe, optional enhancement. Returns null if:
 * - ML model is not loaded
 * - Feature is disabled
 * - Any error occurs
 * 
 * @returns ML predictions or null if unavailable
 */
export function classifyViolations(
  input: ViolationClassifierInput
): ViolationMLPrediction | null {
  try {
    // Guard: ML disabled or unavailable
    if (process.env.ENABLE_ML !== "true") {
      return null;
    }

    // PLACEHOLDER: In production, this would:
    // 1. Load a trained model (TensorFlow.js, ONNX, etc.)
    // 2. Extract features from violations, layers, brand profile
    // 3. Run inference to predict additional violations
    // 4. Calculate confidence scores
    
    // For demo/hackathon: Simulate ML behavior with rule-based heuristics
    // that could be replaced by actual ML models
    
    const suggestions: ViolationMLPrediction["suggestedViolations"] = [];
    let explanation = "ML analysis identified potential additional concerns: ";
    const parts: string[] = [];

    // Pattern: Check for color proximity (could be ML-learned pattern)
    const colorMap = new Map<string, number>();
    input.layers.forEach((layer) => {
      if (layer.fill) {
        const normalized = layer.fill.toUpperCase();
        colorMap.set(normalized, (colorMap.get(normalized) || 0) + 1);
      }
    });

    // Suggest if many layers use colors close to brand colors (ML could detect similarity)
    const nonBrandColors = Array.from(colorMap.keys()).filter(
      (c) => !input.brandProfile.visualRules.colors.includes(c)
    );
    if (nonBrandColors.length > 0 && nonBrandColors.length < colorMap.size / 2) {
      parts.push("color consistency pattern detected");
      // This would be ML confidence, for demo we use heuristic
      suggestions.push({
        id: `ml-color-pattern-${Date.now()}`,
        ruleId: "ml_color_consistency",
        domain: Domain.VISUAL,
        severity: Severity.WARNING,
        message: "Potential color inconsistency pattern detected",
        confidence: 0.65,
      });
    }

    // Pattern: Font mixing (ML could learn brand-specific font pairing rules)
    const fontSet = new Set<string>();
    input.layers.forEach((layer) => {
      if (layer.fontFamily) {
        fontSet.add(layer.fontFamily);
      }
    });
    if (fontSet.size > input.brandProfile.visualRules.fonts.length + 1) {
      parts.push("excessive font variety detected");
      suggestions.push({
        id: `ml-font-mixing-${Date.now()}`,
        ruleId: "ml_font_mixing",
        domain: Domain.VISUAL,
        severity: Severity.WARNING,
        message: "Multiple font families may reduce visual cohesion",
        confidence: 0.72,
      });
    }

    // If no suggestions, return null (ML doesn't add value)
    if (suggestions.length === 0) {
      return null;
    }

    explanation += parts.join(", ") + ".";

    // Calculate average confidence
    const avgConfidence =
      suggestions.reduce((sum, s) => sum + s.confidence, 0) /
      suggestions.length;

    return {
      confidence: avgConfidence,
      suggestedViolations: suggestions,
      explanation,
    };
  } catch (error) {
    // Fail-safe: return null on any error
    console.warn("[ML] ViolationClassifier error:", error);
    return null;
  }
}
