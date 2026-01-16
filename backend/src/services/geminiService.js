/**
 * Groq AI Service
 * 
 * Handles AI-powered content analysis using Groq API.
 * This runs on the backend (Node.js), not in Adobe Express.
 * 
 * IMPORTANT: Requires GROQ_API_KEY environment variable.
 */

// Note: This is a simplified version. In production, you would use
// the actual groq-sdk. For now, this is a placeholder that
// demonstrates the structure.

/**
 * Analyzes text content for brand compliance violations
 * 
 * Uses AI to check for:
 * - Tone violations
 * - Forbidden phrases
 * - Locale-specific issues
 */
const { Groq } = require("groq-sdk");

async function analyzeContent(text, brandProfile) {
  // In a real implementation, you would:
  // 1. Initialize Google Gemini client
  // 2. Send prompt with brand rules
  // 3. Parse AI response for violations
  // 4. Return structured violations

  // For now, return empty array (no violations detected)
  // This allows the system to work without API key during development
  console.log(`[Groq Service] Analyzing content input:`, JSON.stringify(text, null, 2));
  console.log(`[Groq Service] Brand:`, brandProfile.brandName || brandProfile.id);
  if (brandProfile.contentRules) {
    console.log(`[Groq Service] Tone: ${brandProfile.contentRules.tone}`);
  } else if (brandProfile.tone) {
    console.log(`[Groq Service] Tone: ${brandProfile.tone}`);
  }

  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set in environment variables.");
  }
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  // Compose the input object for analysis
  const aiInput = {
    design: text.design || text.layers ? { elements: text.layers || [], canvas: text.canvas || {} } : text.design,
    brandRules: brandProfile,
    context: text.context || { platform: "Adobe Express", exportType: "social" }
  };

  try {
    console.log("[GroqService] Sending input to Groq:\n", JSON.stringify(aiInput, null, 2));
    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: `You are BrandGuard AI, an intelligent brand compliance analysis engine. Analyze the provided design and brand rules for compliance.\n\nReturn only a valid JSON object with the following structure:\n{ summary: string, strengths: string[], issues: Issue[] }\n\nEach Issue must be an object with at least these fields: id (string), type (text|visual|layout), severity (low|medium|high), explanation (string), suggestion (string), and optionally autofix (object as described).\n\nDo not return issues as strings. Do not ask for input or repeat the schema. Only return the JSON object.` },
        { role: "user", content: JSON.stringify(aiInput) }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 2048
    });
    const aiText = response.choices?.[0]?.message?.content;
    let parsed = null;
    if (typeof aiText === "string") {
      try {
        parsed = JSON.parse(aiText);
      } catch (e) {
        parsed = {
          summary: "unknown",
          strengths: [],
          issues: [],
          raw: aiText
        };
      }
    } else if (typeof aiText === "object") {
      parsed = aiText;
    } else {
      parsed = {
        summary: "unknown",
        strengths: [],
        issues: [],
        raw: aiText
      };
    }
    // Post-process: if issues are strings, convert to objects
    if (parsed && Array.isArray(parsed.issues) && typeof parsed.issues[0] === "string") {
      parsed.issues = parsed.issues.map((msg, idx) => ({
        id: `issue-${idx+1}`,
        type: "visual",
        severity: "medium",
        explanation: msg,
        suggestion: "Please review this issue.",
      }));
    }
    if (
      typeof parsed !== "object" ||
      (!Array.isArray(parsed.issues) && !parsed.summary)
    ) {
      parsed = {
        summary: "unknown",
        strengths: [],
        issues: [],
        raw: aiText
      };
    }
    return parsed;
  } catch (error) {
    console.error("Groq AI error:", error);
    return [{
      domain: "content",
      severity: "critical",
      message: "AI service error: " + (error.message || "Unknown error"),
    }];
  }

  /* Example implementation (requires @google/genai package):
  const { GoogleGenAI } = require("@google/genai");
  
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze text for brand compliance...`,
    // ... rest of configuration
  });
  
  return parseViolations(response);
  */
}

module.exports = {
  analyzeContent,
};
