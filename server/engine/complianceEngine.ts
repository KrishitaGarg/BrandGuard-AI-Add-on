/**
 * Compliance Engine (Backend)
 * 
 * Pure, stateless functions for brand compliance analysis.
 * Refactored from frontend to be tool-call friendly and deterministic.
 */

import {
  BrandProfile,
  Layer,
  Violation,
  Severity,
  Domain,
  ComplianceScore,
} from "../../types";
import { analyzeContent } from "../../services/geminiService";

/**
 * Analyzes design layers for brand compliance violations
 * Pure function - no side effects, deterministic
 */
export async function analyzeDesignLayers(
  layers: Layer[],
  profile: BrandProfile
): Promise<Violation[]> {
  const violations: Violation[] = [];

  // 1. Visual Rules Analysis
  for (const layer of layers) {
    // Color Compliance
    if (
      layer.fill &&
      !profile.visualRules.colors.includes(layer.fill.toUpperCase())
    ) {
      violations.push({
        id: `color-${layer.id}`,
        ruleId: "brand_colors",
        domain: Domain.VISUAL,
        severity: Severity.WARNING,
        message: "Non-Brand Color Detected",
        businessContext: {
          reason:
            "Consistent color usage builds brand recognition and professional trust.",
          outcome:
            "Updating this will align the element with our verified brand palette.",
        },
        elementId: layer.id,
        currentValue: layer.fill,
        suggestedValue: profile.visualRules.colors[0],
        autoFixable: true,
      });
    }

    // Typography Compliance
    if (
      layer.type === "text" &&
      layer.fontFamily &&
      !profile.visualRules.fonts.includes(layer.fontFamily)
    ) {
      violations.push({
        id: `font-${layer.id}`,
        ruleId: "brand_typography",
        domain: Domain.VISUAL,
        severity: Severity.CRITICAL,
        message: "Unapproved Typography",
        businessContext: {
          reason:
            "Standardized fonts ensure messaging remains readable and on-brand across all channels.",
          outcome:
            "Fixing this will switch the text to a primary brand font for maximum impact.",
        },
        elementId: layer.id,
        currentValue: layer.fontFamily,
        suggestedValue: profile.visualRules.fonts[0],
        autoFixable: true,
      });
    }

    // Logo Validation
    if (layer.type === "logo") {
      if (layer.width < profile.visualRules.logo.minWidth) {
        violations.push({
          id: `logo-size-${layer.id}`,
          ruleId: "logo_size",
          domain: Domain.VISUAL,
          severity: Severity.CRITICAL,
          message: "Logo Legibility Risk",
          businessContext: {
            reason:
              "Our logo represents our corporate identity and must remain clearly legible at all times.",
            outcome:
              "Adjusting size will ensure the logo meets our minimum clear-visibility standards.",
          },
          elementId: layer.id,
          currentValue: `${layer.width}px`,
          suggestedValue: `${profile.visualRules.logo.minWidth}px`,
          autoFixable: true,
        });
      }
    }
  }

  // 2. Content Rules (AI Analysis)
  const textLayers = layers.filter((l) => l.type === "text" && l.content);
  for (const layer of textLayers) {
    const aiViolations = await analyzeContent(layer.content!, profile);
    aiViolations.forEach((v) => {
      v.elementId = layer.id;
      violations.push(v);
    });
  }

  return violations;
}

/**
 * Calculates compliance score from violations
 * Pure function - deterministic scoring
 */
export function calculateComplianceScore(
  violations: Violation[],
  totalElements: number,
  weights?: { visual: number; content: number }
): ComplianceScore {
  const visualViolations = violations.filter((v) => v.domain === Domain.VISUAL);
  const contentViolations = violations.filter(
    (v) => v.domain === Domain.CONTENT
  );

  const calculateDomainScore = (vCount: number) =>
    Math.max(0, 100 - vCount * 15);

  const visualScore = calculateDomainScore(visualViolations.length);
  const contentScore = calculateDomainScore(contentViolations.length);

  // Default weights: 65% Visual, 35% Content
  const visualWeight = weights?.visual ?? 0.65;
  const contentWeight = weights?.content ?? 0.35;

  const totalScore = Math.round(visualScore * visualWeight + contentScore * contentWeight);

  return {
    total: totalScore,
    visual: visualScore,
    content: contentScore,
  };
}

/**
 * Generates fix instructions for violations
 * Pure function - deterministic fix generation
 */
export function generateFixInstructions(
  violations: Violation[],
  layers: Layer[]
): Array<{
  elementId: string;
  fixType: "color" | "font" | "logo_size" | "content";
  currentValue: string;
  suggestedValue: string;
  updates: Record<string, any>;
}> {
  const fixes: Array<{
    elementId: string;
    fixType: "color" | "font" | "logo_size" | "content";
    currentValue: string;
    suggestedValue: string;
    updates: Record<string, any>;
  }> = [];

  for (const violation of violations) {
    if (!violation.elementId || !violation.autoFixable) continue;

    const layer = layers.find((l) => l.id === violation.elementId);
    if (!layer) continue;

    const updates: Record<string, any> = {};

    switch (violation.ruleId) {
      case "brand_colors":
        updates.fill = violation.suggestedValue;
        fixes.push({
          elementId: violation.elementId,
          fixType: "color",
          currentValue: violation.currentValue,
          suggestedValue: violation.suggestedValue,
          updates,
        });
        break;

      case "brand_typography":
        updates.fontFamily = violation.suggestedValue;
        fixes.push({
          elementId: violation.elementId,
          fixType: "font",
          currentValue: violation.currentValue,
          suggestedValue: violation.suggestedValue,
          updates,
        });
        break;

      case "logo_size":
        const newWidth = parseInt(violation.suggestedValue);
        updates.width = newWidth;
        // Maintain aspect ratio if possible
        if (layer.height && layer.width) {
          const aspectRatio = layer.height / layer.width;
          updates.height = Math.round(newWidth * aspectRatio);
        }
        fixes.push({
          elementId: violation.elementId,
          fixType: "logo_size",
          currentValue: violation.currentValue,
          suggestedValue: violation.suggestedValue,
          updates,
        });
        break;

      case "content_tone":
      case "forbidden_phrase":
        updates.content = violation.suggestedValue;
        fixes.push({
          elementId: violation.elementId,
          fixType: "content",
          currentValue: violation.currentValue,
          suggestedValue: violation.suggestedValue,
          updates,
        });
        break;
    }
  }

  return fixes;
}

