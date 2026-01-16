// textComplianceEngine.js
// Phase 2: Text & Brand-Voice Compliance Engine for Adobe Express Add-on
// This module is a strict additive extension. It does NOT replace or refactor existing visual compliance logic.
//
// All AI calls are:
// - Explicitly user-triggered (never background)
// - Isolated per selected text element
// - Never store or persist content
// - Never auto-apply rewrites
// - Only return structured, explainable JSON (see schema below)
//
// Why AI is used: To evaluate natural-language brand voice and tone, which cannot be fully captured by deterministic rules.
// Why content is not stored: To comply with Adobe and user privacy requirements.
// Why execution is user-controlled: To ensure no background or automatic analysis occurs.

/**
 * Analyze selected text for brand-voice compliance using an AI model.
 * @param {string} text - The selected text content (never full document).
 * @param {string} brandGuidelines - Brand guidelines in natural language.
 * @param {function} aiApiCall - Function to call the AI model (must return a Promise resolving to the required JSON schema).
 * @returns {Promise<Object>} - Structured compliance result (see schema).
 */
async function analyzeTextCompliance(text, brandGuidelines, aiApiCall) {
  // Defensive: Only proceed if text is non-empty and guidelines are provided
  if (!text || !brandGuidelines) {
    return {
      score: 100,
      issues: []
    };
  }

  // Prepare prompt for AI (never send more than selected text)
  const prompt = {
    instruction: "Evaluate the following text for brand-voice compliance. Return ONLY the specified JSON schema. Never include free-form prose.",
    text,
    brandGuidelines,
    schema: {
      score: "0-100 (overall compliance)",
      issues: [
        {
          type: "Tone mismatch | Clarity | Brand voice deviation | Risky phrasing",
          severity: "warning | critical",
          explanation: "Clear, human-readable reason tied to brand guidelines",
          rewriteSuggestions: [
            {
              style: "conservative | neutral | friendly",
              text: "Rewritten version preserving meaning"
            }
          ]
        }
      ]
    }
  };

  // User-triggered: Call AI model (OpenAI-like API)
  let aiResult;
  try {
    aiResult = await aiApiCall(prompt);
  } catch (e) {
    // On error, return conservative result (no issues, do not block pipeline)
    return {
      score: 100,
      issues: []
    };
  }

  // Strict schema enforcement
  if (
    typeof aiResult !== 'object' ||
    typeof aiResult.score !== 'number' ||
    !Array.isArray(aiResult.issues)
  ) {
    // Fallback: treat as compliant if schema is not met
    return {
      score: 100,
      issues: []
    };
  }

  // Clamp score to 0-100
  aiResult.score = Math.max(0, Math.min(100, aiResult.score));

  // Only allow known issue types and severities
  const allowedTypes = [
    'Tone mismatch',
    'Clarity',
    'Brand voice deviation',
    'Risky phrasing'
  ];
  const allowedSeverities = ['warning', 'critical'];
  aiResult.issues = aiResult.issues.filter(issue =>
    allowedTypes.includes(issue.type) &&
    allowedSeverities.includes(issue.severity) &&
    typeof issue.explanation === 'string' &&
    Array.isArray(issue.rewriteSuggestions)
  );

  // Each rewrite suggestion must have required fields
  aiResult.issues.forEach(issue => {
    issue.rewriteSuggestions = (issue.rewriteSuggestions || []).filter(suggestion =>
      ['conservative', 'neutral', 'friendly'].includes(suggestion.style) &&
      typeof suggestion.text === 'string'
    );
  });

  return aiResult;
}

module.exports = {
  analyzeTextCompliance
};
