/**
 * BrandGuard AI Backend Server
 * 
 * IMPORTANT: This is a completely independent Node.js server that runs
 * separately from the Adobe Express Add-on.
 * 
 * - Runs on http://localhost:3000 (separate process)
 * - Has NO Adobe-specific dependencies
 * - Exposes REST APIs only
 * - Can use Node.js APIs, databases, AI SDKs, etc.
 * - Handles CORS for Adobe Express frontend
 * 
 * The Adobe Express Add-on (frontend) is located in /my-adobe-addon/
 * and communicates with this server via fetch() HTTP requests.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });
const express = require("express");
const cors = require("cors");
const { analyzeDesignRoute } = require("./routes/analyze");
const { checkBrandRoute } = require("./routes/checkBrand");
const { parseGuidelinesRoute } = require("./routes/parseGuidelines");
const applyFixRoute = require("./routes/applyFix");
const fixSuggestionsRoutes = require("./routes/fixSuggestions");
const aiSuggestionsRoutes = require("./routes/aiSuggestions");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Enable CORS for Adobe Express Add-on (runs at https://localhost:5241)
app.use(cors({
  origin: [
    "https://localhost:5241", // Adobe Express dev server
    "https://new.express.adobe.com", // Adobe Express production
  ],
  credentials: true,
}));
app.use(express.json());

/**
 * Health check endpoint
 * Used by frontend to verify backend is running
 */
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "BrandGuard AI Backend",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Analyze design for brand compliance
 * 
 * POST /analyze
 * 
 * Request body:
 * {
 *   "design": { ... },
 *   "brandRules": { ... }
 * }
 * 
 * Returns: Analysis results with violations
 */
app.post("/analyze", (req, res, next) => {
  console.log("Received /analyze request", req.body);
  next();
}, analyzeDesignRoute);

/**
 * Check brand configuration
 * 
 * POST /check-brand
 * 
 * Request body:
 * {
 *   "brandId": "string"
 * }
 */
app.post("/check-brand", checkBrandRoute);

/**
 * Parse brand guidelines from text
 * 
 * POST /parse-brand-guidelines
 * 
 * Request body:
 * {
 *   "text": "string"
 * }
 * 
 * Returns: Parsed brand guidelines
 */
app.post("/parse-brand-guidelines", parseGuidelinesRoute);

/**
 * Apply autofix to a design
 * 
 * POST /apply-fix
 * 
 * Request body:
 * {
 *   "designId": "string",
 *   "issueId": "string",
 *   "fix": { ... }
 * }
 * 
 * Returns: Success and applied fix
 */
app.post("/apply-fix", applyFixRoute);

/**
 * NEW: Auto-fix suggestions API routes
 * These extend functionality without modifying existing routes
 */
app.use("/api/fixes", fixSuggestionsRoutes);

/**
 * NEW: AI creative suggestions API routes
 * Separate from compliance - additive recommendations
 */
app.use("/api/ai-suggestions", aiSuggestionsRoutes);

// Direct endpoint for /ai-suggestions (backwards compatibility)
app.post("/ai-suggestions", async (req, res) => {
  try {
    const { canvasData, brandProfile, complianceResult } = req.body;
    
    // Return mock JSON response
    res.json({
      success: true,
      data: {
        headlineSuggestions: [
          'Transform Your Brand Today',
          'Elevate Your Message',
          'Stand Out with Style'
        ],
        bodyCopySuggestions: [
          'Discover how our solutions can help you achieve your goals with confidence.',
          'Join thousands of satisfied customers who trust our innovative approach.'
        ],
        ctaSuggestions: [
          'Get Started Now',
          'Learn More',
          'Try It Free'
        ],
        supportingCopySuggestions: [
          'Built for professionals who demand excellence.'
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate suggestions'
    });
  }
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`\n🚀 BrandGuard AI Backend Server`);
  console.log(`   Running on http://localhost:${PORT}`);
  console.log(`\n   Available endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /analyze - Analyze design for brand compliance`);
  console.log(`   POST /check-brand - Validate brand configuration`);
  console.log(`   POST /parse-brand-guidelines - Parse brand guidelines from text`);
  console.log(`   POST /api/fixes/generate - Generate fix suggestions (NEW)`);
  console.log(`   POST /api/fixes/apply - Apply a fix (NEW)`);
      console.log(`   POST /api/fixes/apply-all - Apply multiple fixes (NEW)`);
      console.log(`   GET  /api/fixes/:designId - Get fixes for design (NEW)`);
      console.log(`   POST /api/ai-suggestions/generate - Generate AI creative suggestions (NEW)`);
      console.log(`\n   Frontend (Adobe Express Add-on) located at:`);
  console.log(`   /my-adobe-addon/`);
  console.log(`   Should connect to: http://localhost:${PORT}\n`);
});

console.log("BrandGuard AI backend server starting...");

module.exports = app;
