/**
 * Simple MCP-like AI Server for BrandGuard
 * 
 * Provides AI insights endpoint at localhost:3001/mcp/invoke
 * No transpilation needed - runs directly with Node.js
 */

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "BrandGuard AI Server",
    timestamp: new Date().toISOString()
  });
});

/**
 * MCP-style endpoint for invoking AI analysis
 * 
 * POST /mcp/invoke
 * 
 * Request body:
 * {
 *   "tool": "analyze_design",
 *   "input": {
 *     "designSummary": { ... }
 *   }
 * }
 */
app.post("/mcp/invoke", async (req, res) => {
  try {
    const { tool, input } = req.body;

    if (!tool) {
      return res.status(400).json({
        error: {
          code: "MISSING_TOOL",
          message: "Tool name is required",
        },
      });
    }

    let result = null;

    // Route to different AI analysis tools
    if (tool === "analyze_design") {
      result = await analyzeDesignTool(input);
    } else {
      return res.status(400).json({
        error: {
          code: "UNKNOWN_TOOL",
          message: `Unknown tool: ${tool}`,
        },
      });
    }

    // Return result in MCP format
    res.json({
      result: result,
      metadata: {
        executionTimeMs: 0,
        toolVersion: "1.0.0",
      },
    });
  } catch (error) {
    console.error("[MCP Server Error]", error.message);
    res.status(500).json({
      result: null,
      metadata: {
        executionTimeMs: 0,
        toolVersion: "1.0.0",
      },
      error: {
        code: "SERVER_ERROR",
        message: error.message || "Unknown error occurred",
      },
    });
  }
});

/**
 * Simulates AI design analysis
 * Returns insights about the design based on the analysis summary
 */
async function analyzeDesignTool(input) {
  const designSummary = input?.designSummary || {};
  const brandScore = designSummary?.brandScore || 0;
  const issues = designSummary?.issues || [];

  // Generate AI insights based on the analysis
  let insight = "";

  if (brandScore >= 90) {
    insight = "Excellent brand compliance! Your design strictly adheres to brand guidelines with minimal deviations. " +
      "The visual hierarchy, color palette, and typography are all consistent with the brand identity.";
  } else if (brandScore >= 75) {
    insight = "Good brand compliance overall. The design follows most brand guidelines, but there are a few areas for improvement. " +
      "Consider refining the typography choices and ensure all elements align with the approved color palette.";
  } else if (brandScore >= 60) {
    insight = "Moderate brand compliance. While the design captures the general brand essence, several elements need adjustment. " +
      "Review the spacing, font selections, and color usage to better match brand standards.";
  } else {
    insight = "Your design needs significant updates to meet brand compliance standards. " +
      "Please review all visual elements including colors, fonts, and layout against the brand guidelines.";
  }

  // Add specific insights based on issues found
  if (issues.length > 0) {
    if (issues.some(issue => issue.toLowerCase().includes("text"))) {
      insight += " The text styling needs attention - check font families and sizes.";
    }
    if (issues.some(issue => issue.toLowerCase().includes("color"))) {
      insight += " Review the color selections to ensure they match the approved palette.";
    }
  }

  return {
    insight: insight.trim(),
    summary: `Brand compliance score: ${brandScore}/100. ${issues.length} issues found.`,
    recommendations: [
      "Review all text elements for font consistency",
      "Verify color palette matches brand guidelines",
      "Check spacing and layout alignment",
      "Ensure logo placement and sizing are correct"
    ]
  };
}

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`\n🚀 BrandGuard AI Server (Simple Mode)`);
  console.log(`   Running on http://localhost:${PORT}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /mcp/invoke - Invoke AI analysis\n`);
});
