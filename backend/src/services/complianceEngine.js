/**
 * Compliance Engine Service
 * 
 * Pure, stateless functions for brand compliance analysis.
 * This runs on the backend (Node.js), not in Adobe Express.
 * 
 * Can use AI services, databases, and other Node.js capabilities.
 */

const { analyzeContent } = require("./geminiService");

/**
 * Analyzes design layers for brand compliance violations
 * 
 * Pure function - no side effects, deterministic
 */
async function analyzeDesignLayers(layers, brandProfile) {
  const violations = [];

  // 1. Visual Rules Analysis
  for (const layer of layers) {
    // Color Compliance
    if (
      typeof layer.fill === "string" &&
      !brandProfile.visualRules.colors.includes(layer.fill.toUpperCase())
    ) {
      const recommendedColor = brandProfile.visualRules.colors[0] || "#000000";
      violations.push({
        id: `color-${layer.id}`,
        ruleId: "brand_colors",
        domain: "visual",
        severity: "warning",
        message: "Non-Brand Color Detected",
        businessContext: {
          reason:
            "Consistent color usage builds brand recognition and professional trust.",
          outcome:
            "Updating this will align the element with our verified brand palette.",
        },
        elementId: layer.id,
        currentValue: layer.fill,
        suggestedValue: recommendedColor,
        autoFixable: true,
        fixAction: {
          type: "update_color",
          elementId: layer.id,
          property: "fill",
          value: recommendedColor,
        },
      });
    }

    // Typography Compliance
    if (
      layer.type === "text" &&
      layer.fontFamily &&
      !brandProfile.visualRules.fonts.includes(layer.fontFamily)
    ) {
      const recommendedFont = brandProfile.visualRules.fonts[0] || "Arial";
      violations.push({
        id: `font-${layer.id}`,
        ruleId: "brand_typography",
        domain: "visual",
        severity: "critical",
        message: "Unapproved Typography",
        businessContext: {
          reason:
            "Standardized fonts ensure messaging remains readable and on-brand across all channels.",
          outcome:
            "Fixing this will switch the text to a primary brand font for maximum impact.",
        },
        elementId: layer.id,
        currentValue: layer.fontFamily,
        suggestedValue: recommendedFont,
        autoFixable: true,
        fixAction: {
          type: "update_font",
          elementId: layer.id,
          property: "fontFamily",
          value: recommendedFont,
        },
      });
    }

    // Logo Validation
    if (layer.type === "logo") {
      if (layer.width < brandProfile.visualRules.logo.minWidth) {
        const minWidth = brandProfile.visualRules.logo.minWidth;
        const recommendedWidth = Math.max(minWidth, layer.width || minWidth);
        violations.push({
          id: `logo-size-${layer.id}`,
          ruleId: "logo_size",
          domain: "visual",
          severity: "critical",
          message: "Logo Legibility Risk",
          businessContext: {
            reason:
              "Our logo represents our corporate identity and must remain clearly legible at all times.",
            outcome:
              "Adjusting size will ensure the logo meets our minimum clear-visibility standards.",
          },
          elementId: layer.id,
          currentValue: `${layer.width}px`,
          suggestedValue: `${recommendedWidth}px`,
          autoFixable: true,
          fixAction: {
            type: "resize_element",
            elementId: layer.id,
            property: "width",
            value: recommendedWidth,
            maintainAspectRatio: true,
          },
        });
      }
    }
  }

  // 2. Content Rules (Forbidden Phrases - Simple Pattern Matching)
  const textLayers = layers.filter((l) => l.type === "text" && l.content);
  const forbiddenPhrases = brandProfile.contentRules?.forbiddenPhrases || [];
  
  for (const layer of textLayers) {
    const text = layer.content || "";
    const textLower = text.toLowerCase();
    
    // Check for forbidden phrases
    for (const phrase of forbiddenPhrases) {
      if (phrase && textLower.includes(phrase.toLowerCase())) {
        // Find a suggested replacement (could be from preferred terms or generic)
        const preferredTerms = brandProfile.contentRules?.preferredTerms || [];
        const suggestedReplacement = preferredTerms.length > 0 
          ? preferredTerms[0] 
          : "[appropriate alternative]";
        
        violations.push({
          id: `forbidden-phrase-${layer.id}-${Date.now()}`,
          ruleId: "forbidden_phrase",
          domain: "content",
          severity: "high",
          message: `Forbidden phrase detected: "${phrase}"`,
          businessContext: {
            reason: `The phrase "${phrase}" is not aligned with brand guidelines.`,
            outcome: `Replacing this will ensure content aligns with brand messaging.`,
          },
          elementId: layer.id,
          currentValue: phrase,
          suggestedValue: suggestedReplacement,
          autoFixable: true,
          fixAction: {
            type: "replace_text",
            elementId: layer.id,
            find: phrase,
            replace: suggestedReplacement,
          },
        });
      }
    }
  }

  // 3. AI Analysis (if available)
  for (const layer of textLayers) {
    try {
      const layerText = layer.content || "";
      const aiViolations = await analyzeContent(layerText, brandProfile);
      // Convert AI violations to our format and add fixAction if possible
      if (aiViolations && Array.isArray(aiViolations.issues)) {
        aiViolations.issues.forEach((issue) => {
          const violation = {
            id: `ai-${issue.id || `issue-${Date.now()}-${Math.random()}`}`,
            ruleId: issue.type || "content_ai",
            domain: "content",
            severity: issue.severity || "medium",
            message: issue.explanation || issue.message || "Content issue detected",
            businessContext: {
              reason: issue.explanation || "AI-detected content issue",
              outcome: issue.suggestion || "Review and update content",
            },
            elementId: layer.id,
            currentValue: layerText.substring(0, 50) + (layerText.length > 50 ? "..." : ""),
            suggestedValue: issue.suggestion || "",
            autoFixable: false, // AI suggestions typically need review
          };
          
          // If AI provides autofix data, use it
          if (issue.autofix) {
            violation.autoFixable = true;
            violation.fixAction = {
              type: issue.autofix.type || "replace_text",
              elementId: layer.id,
              ...issue.autofix,
            };
          }
          
          violations.push(violation);
        });
      }
    } catch (error) {
      console.error(`Failed to analyze content for layer ${layer.id}:`, error);
      // Continue with other layers even if one fails
    }
  }

  return violations;
}

/**
 * Calculates compliance score from violations and layers
 * 
 * NEW APPROACH: Rewards actual brand usage, not just absence of violations
 * Scoring factors:
 * 1. Violation severity and count
 * 2. Brand element coverage (what % of design uses brand guidelines)
 * 3. Minimum requirements (design must have some brand elements)
 */
function calculateComplianceScore(violations, layers, brandProfile, weights) {
  // Count violation types
  const criticalViolations = violations.filter((v) => v.severity === "critical");
  const warningViolations = violations.filter((v) => v.severity === "warning");
  const visualViolations = violations.filter((v) => v.domain === "visual");
  const contentViolations = violations.filter((v) => v.domain === "content");

  // ===== CALCULATE BRAND COVERAGE =====
  // What percentage of design actually uses brand elements?
  const brandCoverage = calculateBrandCoverage(layers, brandProfile);

  // ===== CALCULATE VIOLATION PENALTIES =====
  // Critical violations: -25 points each
  // Warning violations: -10 points each
  const criticalPenalty = criticalViolations.length * 25;
  const warningPenalty = warningViolations.length * 10;
  const totalPenalty = Math.min(60, criticalPenalty + warningPenalty); // Cap at -60

  // ===== CALCULATE BASE SCORE =====
  // Start with coverage percentage
  let baseScore = Math.round(brandCoverage * 60); // Coverage = 0-60 points

  // Add minimum design requirement score
  const hasContent = layers.some((l) => l.type === "text");
  const hasVisualElements = layers.length > 0;
  const designCompleteness = calculateDesignCompleteness(layers);

  baseScore += Math.round(designCompleteness * 40); // Completeness = 0-40 points

  // ===== FINAL SCORE =====
  const finalScore = Math.max(0, baseScore - totalPenalty);

  // ===== DOMAIN SCORES =====
  const visualScore = calculateDomainScore(
    visualViolations.length,
    layers.filter((l) => l.type !== "text").length
  );
  const contentScore = hasContent
    ? Math.max(0, 100 - contentViolations.length * 20)
    : 50; // Lower score if no text content

  const visualWeight = weights?.visual ?? 0.65;
  const contentWeight = weights?.content ?? 0.35;

  return {
    total: Math.round(finalScore),
    visual: visualScore,
    content: contentScore,
    breakdown: {
      brandCoverage: Math.round(brandCoverage * 100),
      designCompleteness: Math.round(designCompleteness * 100),
      violationPenalty: totalPenalty,
      criticalViolations: criticalViolations.length,
      warningViolations: warningViolations.length,
      hasContent,
      hasVisualElements,
    },
  };
}

/**
 * Calculate what % of design uses brand-approved elements
 */
function calculateBrandCoverage(layers, brandProfile) {
  if (layers.length === 0) return 0;

  let brandCompliantElements = 0;

  for (const layer of layers) {
    let isCompliant = true;

    // Check color compliance
    if (layer.fill) {
      const isBrandColor = brandProfile.visualRules.colors.some(
        (c) => c.toUpperCase() === layer.fill.toUpperCase()
      );
      if (!isBrandColor) isCompliant = false;
    }

    // Check typography compliance
    if (layer.type === "text" && layer.fontFamily) {
      const isBrandFont = brandProfile.visualRules.fonts.includes(layer.fontFamily);
      if (!isBrandFont) isCompliant = false;
    }

    // Check logo requirements
    if (layer.type === "logo") {
      if (layer.width < brandProfile.visualRules.logo.minWidth) {
        isCompliant = false;
      }
    }

    if (isCompliant) {
      brandCompliantElements++;
    }
  }

  return brandCompliantElements / layers.length;
}

/**
 * Assess design completeness based on element types and requirements
 * 
 * Penalizes:
 * - Missing text/messaging
 * - Too few elements (minimal composition)
 * - Incomplete element variety
 */
function calculateDesignCompleteness(layers) {
  if (layers.length === 0) return 0;

  const hasText = layers.some((l) => l.type === "text");
  const hasShapes = layers.some((l) => l.type === "shape");
  const hasImages = layers.some((l) => l.type === "image");
  const hasLogo = layers.some((l) => l.type === "logo");
  const elementCount = layers.length;

  // ===== PENALTIES =====
  let score = 1.0; // Start at 100%

  // Major penalty: No text/messaging
  if (!hasText) {
    score -= 0.4; // -40 points (missing brand messaging is critical)
  }

  // Significant penalty: Only 1 element
  if (elementCount === 1) {
    score -= 0.25; // -25 points (too minimal)
  } else if (elementCount === 2) {
    score -= 0.15; // -15 points (still quite minimal)
  }

  // Element variety bonus (if has multiple types)
  const elementTypes = [hasText, hasShapes, hasImages, hasLogo].filter(Boolean).length;
  if (elementTypes >= 3) {
    score += 0.15; // Bonus for variety
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate domain-specific score with layer context
 */
function calculateDomainScore(violationCount, elementCount) {
  if (elementCount === 0) return 50; // Default if no elements of this type

  // Each violation reduces score by 20 points per violation
  const violationPenalty = Math.min(50, violationCount * 20);
  return Math.max(0, 100 - violationPenalty);
}

module.exports = {
  analyzeDesignLayers,
  calculateComplianceScore,
};
