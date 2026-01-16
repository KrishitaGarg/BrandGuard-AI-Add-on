const express = require('express');
const router = express.Router();
const { applyAutofix } = require('../services/autofixService');

// This endpoint applies autofix to text content
// Expected body: { text, issues, brandGuidelines }

router.post('/', async (req, res) => {
  try {
    const { text, issues, brandGuidelines } = req.body;

    if (typeof text !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: "Missing or invalid text parameter" 
      });
    }

    if (!brandGuidelines) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing brandGuidelines" 
      });
    }

    // Apply autofix
    const result = applyAutofix({
      text,
      issues: issues || [],
      brandGuidelines: {
        preferredTerms: brandGuidelines.preferredTerms || {},
        disallowedTerms: brandGuidelines.disallowedTerms || [],
        toneRules: brandGuidelines.toneRules || []
      }
    });

    res.json({
      success: true,
      fixedText: result.fixedText,
      appliedFixes: result.appliedFixes,
      changed: result.changed
    });
  } catch (error) {
    console.error('Autofix error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to apply autofix'
    });
  }
});

module.exports = router;
