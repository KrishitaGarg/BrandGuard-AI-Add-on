/**
 * AI Suggestions Route
 * 
 * Endpoint for generating creative content suggestions.
 * Separate from compliance analysis - these are additive recommendations.
 */

const express = require('express');
const router = express.Router();
const { generateAISuggestions } = require('../services/aiSuggestionService');

/**
 * POST /api/ai-suggestions/generate
 * 
 * Generate AI-based creative suggestions for a design
 * 
 * Request body:
 * {
 *   "canvasData": { layers: [...], canvas: {...} },
 *   "brandProfile": { tonePreference, visualRules, ... },
 *   "complianceResult": { ... } (optional, for context)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "headlineSuggestions": [...],
 *     "bodyCopySuggestions": [...],
 *     "ctaSuggestions": [...],
 *     "supportingCopySuggestions": [...]
 *   }
 * }
 */
router.post('/generate', async (req, res) => {
  try {
    // Read canvas data and brand guidelines from request body
    const { canvasData, brandProfile, complianceResult } = req.body;

    console.log('[AISuggestions] POST /api/ai-suggestions/generate called');
    console.log('[AISuggestions] Canvas layers:', canvasData?.layers?.length || 0);
    console.log('[AISuggestions] Brand profile:', brandProfile?.brandName || 'N/A');

    // Generate AI-based content suggestions (headlines, body copy, CTA ideas)
    // For now, return static suggestions - can be enhanced with AI later
    const suggestions = {
      headlineSuggestions: [
        'Transform Your Brand Today',
        'Elevate Your Message',
        'Stand Out with Style',
        'Create Impactful Content'
      ],
      bodyCopySuggestions: [
        'Discover how our solutions can help you achieve your goals with confidence.',
        'Join thousands of satisfied customers who trust our innovative approach.',
        'Experience the difference that quality and attention to detail can make.'
      ],
      ctaSuggestions: [
        'Get Started Now',
        'Learn More',
        'Try It Free',
        'Contact Us Today'
      ],
      supportingCopySuggestions: [
        'Built for professionals who demand excellence.',
        'Simple, powerful, and designed for you.'
      ]
    };

    // Return structured JSON
    res.json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    console.error('[AISuggestions] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate suggestions'
    });
  }
});

module.exports = router;
