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

    const suggestions = await generateAISuggestions({
      canvasData,
      brandProfile,
      complianceResult
    });

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
