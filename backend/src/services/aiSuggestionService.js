/**
 * AI Suggestion Service
 * 
 * Generates creative content suggestions based on brand guidelines and canvas data.
 * This is separate from compliance checks - these are additive recommendations.
 */

const { Groq } = require("groq-sdk");

/**
 * Generate AI-based creative suggestions for a design
 * 
 * @param {Object} params
 * @param {Object} params.canvasData - Current canvas state (layers, text, images)
 * @param {Object} params.brandProfile - Brand guidelines (voice, tone, colors, typography)
 * @param {Object} params.complianceResult - Existing compliance analysis (for context only)
 * @returns {Promise<Object>} Structured suggestions
 */
async function generateAISuggestions({ canvasData, brandProfile, complianceResult }) {
  if (!process.env.GROQ_API_KEY) {
    console.warn("[AISuggestionService] GROQ_API_KEY not set, returning empty suggestions");
    return {
      headlineSuggestions: [],
      bodyCopySuggestions: [],
      ctaSuggestions: [],
      supportingCopySuggestions: []
    };
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  // Extract text layers from canvas
  const textLayers = (canvasData.layers || []).filter(layer => 
    layer.type === 'text' || layer.text !== undefined
  );
  const hasText = textLayers.length > 0;
  const existingText = textLayers.map(layer => layer.text || layer.content || '').join(' ');

  // Extract visual context
  const hasImages = (canvasData.layers || []).some(layer => 
    layer.type === 'image' || layer.fill !== undefined
  );

  // Build brand context
  const brandContext = {
    tone: brandProfile.tonePreference || brandProfile.contentRules?.tone || 'neutral',
    voice: brandProfile.voice || 'professional',
    colors: brandProfile.visualRules?.colors || [],
    fonts: brandProfile.visualRules?.fonts || [],
    preferredTerms: brandProfile.preferredTerms || [],
    disallowedPhrases: brandProfile.disallowedPhrases || []
  };

  // Build Groq prompt for creative suggestions
  const prompt = `You are a creative content strategist helping to generate brand-aligned content suggestions.

BRAND GUIDELINES:
- Tone: ${brandContext.tone}
- Voice: ${brandContext.voice}
${brandContext.colors.length > 0 ? `- Colors: ${brandContext.colors.join(', ')}` : ''}
${brandContext.fonts.length > 0 ? `- Fonts: ${brandContext.fonts.join(', ')}` : ''}

CURRENT DESIGN:
${hasText ? `- Existing text: "${existingText}"` : '- No text currently in design'}
${hasImages ? '- Contains images/visuals' : '- No images in design'}

Generate creative content suggestions that align with the brand guidelines:
${hasText ? '1. Suggest 2-3 alternative headlines or better wording for existing text' : '1. Suggest 3-4 headline options'}
${hasText ? '2. Suggest supporting body copy that complements existing text' : '2. Suggest body copy for the design'}
3. Suggest 2-3 CTA (call-to-action) variants
${hasImages ? '4. Suggest supporting copy that complements the visuals' : ''}

Return ONLY a JSON object with this structure:
{
  "headlineSuggestions": ["suggestion 1", "suggestion 2", ...],
  "bodyCopySuggestions": ["suggestion 1", "suggestion 2", ...],
  "ctaSuggestions": ["suggestion 1", "suggestion 2", ...],
  "supportingCopySuggestions": ["suggestion 1", ...]
}

Keep suggestions concise, brand-appropriate, and actionable.`;

  try {
    console.log("[AISuggestionService] Generating suggestions with Groq");
    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a creative content strategist. Return only valid JSON. Do not include markdown formatting or explanations." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1024
    });

    const aiText = response.choices?.[0]?.message?.content;
    let suggestions = null;

    if (typeof aiText === "string") {
      try {
        // Remove markdown code blocks if present
        const cleaned = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        suggestions = JSON.parse(cleaned);
      } catch (e) {
        console.error("[AISuggestionService] Failed to parse Groq response:", e);
        suggestions = null;
      }
    }

    // Ensure structure is valid
    if (!suggestions || typeof suggestions !== 'object') {
      return {
        headlineSuggestions: [],
        bodyCopySuggestions: [],
        ctaSuggestions: [],
        supportingCopySuggestions: []
      };
    }

    // Validate and normalize arrays
    return {
      headlineSuggestions: Array.isArray(suggestions.headlineSuggestions) 
        ? suggestions.headlineSuggestions.filter(s => typeof s === 'string' && s.trim().length > 0)
        : [],
      bodyCopySuggestions: Array.isArray(suggestions.bodyCopySuggestions)
        ? suggestions.bodyCopySuggestions.filter(s => typeof s === 'string' && s.trim().length > 0)
        : [],
      ctaSuggestions: Array.isArray(suggestions.ctaSuggestions)
        ? suggestions.ctaSuggestions.filter(s => typeof s === 'string' && s.trim().length > 0)
        : [],
      supportingCopySuggestions: Array.isArray(suggestions.supportingCopySuggestions)
        ? suggestions.supportingCopySuggestions.filter(s => typeof s === 'string' && s.trim().length > 0)
        : []
    };

  } catch (error) {
    console.error("[AISuggestionService] Error generating suggestions:", error);
    return {
      headlineSuggestions: [],
      bodyCopySuggestions: [],
      ctaSuggestions: [],
      supportingCopySuggestions: [],
      error: error.message || 'Failed to generate suggestions'
    };
  }
}

module.exports = {
  generateAISuggestions
};
