/**
 * Parse Brand Guidelines Route
 *
 * Accepts raw text (or PDF text) and returns a structured brandConfig object.
 * POST /parse-brand-guidelines
 * {
 *   "text": "...brand guidelines..."
 * }
 * Returns: { result: brandConfig }
 */

function parseGuidelinesRoute(req, res) {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({
        error: {
          code: "MISSING_TEXT",
          message: "text is required"
        }
      });
    }

    // Simple parser: extract rules from text (replace with AI/NLP as needed)
    // Example: Look for lines like "Ensure good contrast between text and background"
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const visual = { colors: [], fonts: [], logo: {} };
    const content = { tone: "professional", forbiddenPhrases: [], locale: "en-US" };
    lines.forEach(line => {
      if (line.toLowerCase().includes("contrast")) visual.colors.push("#000000");
      if (line.toLowerCase().includes("font")) visual.fonts.push("Arial");
      if (line.toLowerCase().includes("logo")) visual.logo = { minWidth: 100, aspectRatio: 1.5, padding: 20 };
      if (line.toLowerCase().includes("tone")) content.tone = "friendly";
      if (line.toLowerCase().includes("forbidden")) content.forbiddenPhrases.push(line);
    });
    const brandConfig = { brandId: "demo-brand", visual, content };
    res.json({ result: brandConfig });
  } catch (error) {
    res.status(500).json({
      error: {
        code: "PARSE_ERROR",
        message: error.message || "Unknown error occurred"
      }
    });
  }
}

module.exports = { parseGuidelinesRoute };
