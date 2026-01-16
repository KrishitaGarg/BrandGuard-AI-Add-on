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
  console.log(`\n   Frontend (Adobe Express Add-on) located at:`);
  console.log(`   /my-adobe-addon/`);
  console.log(`   Should connect to: http://localhost:${PORT}\n`);
});

console.log("BrandGuard AI backend server starting...");

module.exports = app;
