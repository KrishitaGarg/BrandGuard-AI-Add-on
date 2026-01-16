/**
 * Analyze Design Route
 * 
 * This route handles brand compliance analysis requests from the frontend.
 * The frontend sends design data (layers, colors, fonts, etc.) and brand rules,
 * and this endpoint performs AI-powered analysis to detect violations.
 * 
 * IMPORTANT: This runs on the backend (Node.js), not in Adobe Express.
 * The frontend is located in /my-adobe-addon/ and communicates via fetch().
 */

const { analyzeDesignLayers, calculateComplianceScore } = require("../services/complianceEngine");

/**
 * POST /analyze
 * 
 * Analyzes a design for brand compliance violations
 */
async function analyzeDesignRoute(req, res) {
  try {
    const { design, brandRules } = req.body;

    // Validate request
    if (!design || !brandRules) {
      return res.status(400).json({
        error: {
          code: "MISSING_PARAMETERS",
          message: "design and brandRules are required",
        },
      });
    }

    if (!design.layers || !Array.isArray(design.layers)) {
      return res.status(400).json({
        error: {
          code: "INVALID_DESIGN",
          message: "design.layers must be an array",
        },
      });
    }

    // Transform design to new schema for Gemini
    const elements = design.layers.map(layer => {
      return {
        type: layer.type || (layer.text !== undefined ? "text" : layer.fill !== undefined ? "shape" : "image"),
        properties: {
          color: layer.fill,
          font: layer.fontFamily,
          size: layer.fontSize,
          position: layer.position,
          scale: layer.scale,
          contrastRatio: layer.contrastRatio,
        }
      };
    });
    // Canvas info is not available in the current payload, so use a placeholder
    const canvas = { width: 1080, height: 1080, backgroundColor: "#FFFFFF" };

    // Transform brandRules to legacy brandProfile for complianceEngine
    const brandProfile = {
      visualRules: {
        colors: brandRules.visual?.colors || [],
        fonts: brandRules.visual?.fonts || [],
        logo: {
          minWidth: brandRules.visual?.logo?.minWidth || 0.1,
          aspectRatio: brandRules.visual?.logo?.aspectRatio || 1.5,
          padding: brandRules.visual?.logo?.padding || 0.1,
        },
      },
      contentRules: {
        tone: brandRules.content?.tone || "professional",
        forbiddenPhrases: brandRules.content?.forbiddenPhrases || [],
        locale: brandRules.content?.locale || "en-US"
      },
      brandId: brandRules.brandId || "",
    };

    // Transform brandRules to new schema for Gemini
    const aiBrandRules = {
      allowedColors: brandRules.visual?.colors || [],
      primaryFont: brandRules.visual?.fonts?.[0] || "",
      logo: {
        minSizeRatio: brandRules.visual?.logo?.minWidth || 0.1,
        aspectRatio: brandRules.visual?.logo?.aspectRatio || 1.5,
        clearSpaceRatio: brandRules.visual?.logo?.padding || 0.1,
      },
      tone: [brandRules.content?.tone || "professional"]
    };

    // Compose new design object for Gemini
    const aiDesign = { elements, canvas };
    // Compose context
    const aiContext = { platform: "Adobe Express", exportType: "social" };
    // Compose full input for Gemini
    const aiInput = { design: aiDesign, brandRules: aiBrandRules, context: aiContext };

    // Analyze design layers for violations (legacy)
    const violations = await analyzeDesignLayers(design.layers, brandProfile);

    // Call Gemini with new schema
    const { analyzeContent } = require("../services/geminiService");
    let aiResult = null;
    try {
      aiResult = await analyzeContent(aiInput, aiBrandRules);
    } catch (e) {
      console.error("Gemini AI error:", e);
    }

    // Calculate compliance score using new scoring system
      const complianceScore = calculateComplianceScore(
        violations,
        design.layers,
        brandProfile,
        { visual: 0.65, content: 0.35 }
      );

    // Build summary (legacy)
    const visualViolations = violations.filter((v) => v.domain === "visual");
    const contentViolations = violations.filter((v) => v.domain === "content");
    const criticalViolations = violations.filter((v) => v.severity === "critical");
    const warningViolations = violations.filter((v) => v.severity === "warning");

    // Handle Groq response (plain JSON or error)
    let aiParsed = null;
    console.log("[Groq] Raw aiResult:", JSON.stringify(aiResult, null, 2));
    if (aiResult && typeof aiResult === "object" && (Array.isArray(aiResult) || aiResult.summary || aiResult.issues)) {
      // Already parsed JSON from Groq
      aiParsed = aiResult;
    } else if (typeof aiResult === "string") {
      try {
        aiParsed = JSON.parse(aiResult);
      } catch (e) {
        aiParsed = {
          summary: "unknown",
          strengths: [],
          issues: [],
          raw: aiResult
        };
      }
    } else if (aiResult && aiResult.error) {
      aiParsed = { summary: aiResult.error.message || "AI service unavailable", strengths: [], issues: [] };
    }
    if (!aiParsed || !Array.isArray(aiParsed.issues)) {
      aiParsed = {
        summary: "No AI-powered issues returned.",
        strengths: [],
        issues: []
      };
    }

    const responseObj = {
      result: {
        legacy: {
          violations,
          brandScore: complianceScore.total,
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
          scoreBreakdown: complianceScore.breakdown,
          metadata: {
            analyzedElements: design.layers.length,
            analysisTimestamp: new Date().toISOString(),
          },
        },
        ai: aiParsed,
      },
      metadata: {
        executionTimeMs: 0, // Could track actual execution time
        toolVersion: "1.0.0",
      },
    };
    console.log("[analyze.js] aiParsed:", JSON.stringify(aiParsed, null, 2));
    console.log("[analyze.js] Full response to frontend:", JSON.stringify(responseObj, null, 2));
    res.json(responseObj);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({
        result: null,
        metadata: {
          executionTimeMs: 0,
          toolVersion: "1.0.0",
        },
        error: {
          code: "ANALYSIS_ERROR",
          message: error.message || "Unknown error occurred",
        },
      });
    }
}

module.exports = { analyzeDesignRoute };
