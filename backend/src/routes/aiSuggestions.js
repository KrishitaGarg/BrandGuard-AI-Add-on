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
    const { canvasData, brandProfile, complianceResult } = req.body;

    if (!canvasData) {
      return res.status(400).json({
        success: false,
        error: 'canvasData is required'
      });
    }

    if (!brandProfile) {
      return res.status(400).json({
        success: false,
        error: 'brandProfile is required'
      });
    }

    console.log('[AISuggestions] Generating suggestions for design with', 
      canvasData.layers?.length || 0, 'layers');

    // Return mock data for now
    const mockSuggestions = {
      headlineSuggestions: [
        'Transform Your Brand Today',
        'Elevate Your Message',
        'Stand Out with Style'
      ],
      bodyCopySuggestions: [
        'Discover how our solutions can help you achieve your goals with confidence.',
        'Join thousands of satisfied customers who trust our innovative approach.',
        'Experience the difference that quality and attention to detail can make.'
      ],
      ctaSuggestions: [
        'Get Started Now',
        'Learn More',
        'Try It Free'
      ],
      supportingCopySuggestions: [
        'Built for professionals who demand excellence.',
        'Simple, powerful, and designed for you.'
      ]
    };

    // Try to generate real suggestions, fallback to mock on error
    let suggestions;
    try {
      suggestions = await generateAISuggestions({
        canvasData,
        brandProfile,
        complianceResult
      });
      
      // Ensure all arrays exist
      if (!suggestions.headlineSuggestions || suggestions.headlineSuggestions.length === 0) {
        suggestions.headlineSuggestions = mockSuggestions.headlineSuggestions;
      }
      if (!suggestions.bodyCopySuggestions || suggestions.bodyCopySuggestions.length === 0) {
        suggestions.bodyCopySuggestions = mockSuggestions.bodyCopySuggestions;
      }
      if (!suggestions.ctaSuggestions || suggestions.ctaSuggestions.length === 0) {
        suggestions.ctaSuggestions = mockSuggestions.ctaSuggestions;
      }
      if (!suggestions.supportingCopySuggestions || suggestions.supportingCopySuggestions.length === 0) {
        suggestions.supportingCopySuggestions = mockSuggestions.supportingCopySuggestions;
      }
    } catch (aiError) {
      console.warn('[AISuggestions] AI service failed, using mock data:', aiError.message);
      suggestions = mockSuggestions;
    }

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
