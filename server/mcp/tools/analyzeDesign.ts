/**
 * MCP Tool: analyze_design
 * 
 * Analyzes a design for brand compliance violations.
 * Returns structured violations with severity and explanations.
 */

import { ComplianceAnalysisResult } from "../schemas/compliance.schema";
import { analyzeDesignLayers } from "../../engine/complianceEngine";
import { BrandProfile, Domain, Severity, Layer } from "../../../types";
import { AdobeContext } from "../context/adobeContext";
import { requestMLViolationClassification } from "../../mlBridge";

export interface AnalyzeDesignInput {
  design: {
    designId: string;
    canvas: {
      width: number;
      height: number;
    };
    layers: Array<{
      id: string;
      type: "text" | "shape" | "image" | "logo";
      content?: string;
      fill?: string;
      fontFamily?: string;
      fontWeight?: number;
      width: number;
      height: number;
      x: number;
      y: number;
    }>;
  };
  brandRules: {
    brandId: string;
    visual: {
      colors: string[];
      fonts: string[];
      logo: {
        minWidth: number;
        aspectRatio: number;
        padding: number;
      };
    };
    content: {
      tone: string;
      forbiddenPhrases: string[];
      locale: string;
    };
  };
  context?: AdobeContext;
}

export interface AnalyzeDesignOutput {
  result: ComplianceAnalysisResult;
  metadata: {
    executionTimeMs: number;
    toolVersion: string;
  };
}

/**
 * MCP Tool: analyze_design
 * 
 * Analyzes design metadata against brand rules and returns violations.
 */
export async function analyzeDesign(
  input: AnalyzeDesignInput
): Promise<AnalyzeDesignOutput> {
  const startTime = Date.now();

  // Convert input to internal types
  const profile: BrandProfile = {
    id: input.brandRules.brandId,
    brandName: input.brandRules.brandId, // Fallback, should come from brand config
    visualRules: {
      colors: input.brandRules.visual.colors,
      fonts: input.brandRules.visual.fonts,
      logo: input.brandRules.visual.logo,
    },
    contentRules: {
      tone: input.brandRules.content.tone,
      forbiddenPhrases: input.brandRules.content.forbiddenPhrases,
      locale: input.brandRules.content.locale,
    },
  };

  // Analyze design layers
  const violations = await analyzeDesignLayers(input.design.layers, profile);

  // Build summary
  const visualViolations = violations.filter((v) => v.domain === Domain.VISUAL);
  const contentViolations = violations.filter((v) => v.domain === Domain.CONTENT);
  const criticalViolations = violations.filter((v) => v.severity === Severity.CRITICAL);
  const warningViolations = violations.filter((v) => v.severity === Severity.WARNING);

  const result: ComplianceAnalysisResult = {
    violations,
    summary: {
      totalViolations: violations.length,
      byDomain: {
        visual: visualViolations.length,
        content: contentViolations.length,
      },
      bySeverity: {
        critical: criticalViolations.length,
        warning: warningViolations.length,
      },
    },
    metadata: {
      analyzedElements: input.design.layers.length,
      analysisTimestamp: new Date().toISOString(),
    },
  };

  const executionTime = Date.now() - startTime;

  // Optional ML enhancement (non-authoritative, metadata only)
  const mlResult = requestMLViolationClassification(
    violations,
    input.design.layers as Layer[],
    profile
  );

  // Build metadata with optional ML info
  const metadata: AnalyzeDesignOutput["metadata"] & { ml?: any } = {
    executionTimeMs: executionTime,
    toolVersion: "1.0.0",
  };

  if (mlResult.available && mlResult.prediction) {
    metadata.ml = {
      violationClassification: {
        confidence: mlResult.prediction.confidence,
        suggestedViolations: mlResult.prediction.suggestedViolations,
        explanation: mlResult.prediction.explanation,
      },
    };
  }

  return {
    result,
    metadata,
  };
}

