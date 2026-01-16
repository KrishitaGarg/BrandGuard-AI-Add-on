/**
 * Fix Suggestions API Routes
 * 
 * NEW API endpoints for auto-fix functionality.
 * These routes extend the existing API without modifying existing routes.
 */

const express = require('express');
const router = express.Router();
const fixSuggestionGenerator = require('../services/fixSuggestionGenerator');
const fixApplicator = require('../services/fixApplicator');
const FixSuggestion = require('../models/FixSuggestion');
const { analyzeDesignLayers, calculateComplianceScore } = require('../services/complianceEngine');

/**
 * POST /api/fixes/generate
 * Generate fix suggestions based on compliance analysis
 * 
 * Request body:
 * {
 *   "designId": "string",
 *   "brandId": "string",
 *   "industry": "string" (optional, defaults to "general"),
 *   "complianceResults": { ... } (optional, will analyze if not provided),
 *   "design": { ... } (required if complianceResults not provided)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "fixes": [...],
 *     "potentialScoreIncrease": number,
 *     "summary": { ... }
 *   }
 * }
 */
router.post('/generate', async (req, res) => {
  try {
    const { designId, brandId, industry = 'general', complianceResults, design, brandRules } = req.body;

    // Validate required parameters
    if (!designId || !brandId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'designId and brandId are required'
        }
      });
    }

    // If compliance results not provided, run analysis first
    let analysisResults = complianceResults;
    if (!analysisResults) {
      if (!design || !brandRules) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Either complianceResults or (design and brandRules) must be provided'
          }
        });
      }

      // Run compliance analysis
      const brandProfile = {
        visualRules: {
          colors: brandRules.visual?.colors || [],
          fonts: brandRules.visual?.fonts || [],
          logo: brandRules.visual?.logo || {}
        },
        contentRules: {
          tone: brandRules.content?.tone || 'professional',
          forbiddenPhrases: brandRules.content?.forbiddenPhrases || [],
          locale: brandRules.content?.locale || 'en-US'
        },
        brandId: brandId
      };

      const violations = await analyzeDesignLayers(design.layers || [], brandProfile);
      const totalElements = design.layers?.length || 0;
      const score = calculateComplianceScore(violations, totalElements);

      analysisResults = {
        violations,
        score: score.total,
        design
      };
    }

    // Generate fix suggestions using dynamic data from database
    const fixSuggestions = await fixSuggestionGenerator.generateFixSuggestions(
      analysisResults,
      brandId,
      industry
    );

    // Save fix suggestions to database
    for (const fix of fixSuggestions.fixes) {
      await FixSuggestion.saveFixSuggestion(fix, designId, brandId);
    }

    res.json({
      success: true,
      data: fixSuggestions,
      metadata: {
        designId,
        brandId,
        industry,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating fix suggestions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FIX_GENERATION_ERROR',
        message: error.message || 'Failed to generate fix suggestions'
      }
    });
  }
});

/**
 * POST /api/fixes/apply
 * Apply a single fix and generate Adobe Express SDK commands
 * 
 * Request body:
 * {
 *   "fixId": "string",
 *   "designId": "string",
 *   "elementId": "string" (optional, can be extracted from fix)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "commands": [...],
 *     "fix": { ... }
 *   }
 * }
 */
router.post('/apply', async (req, res) => {
  try {
    const { fixId, designId, elementId } = req.body;

    if (!fixId || !designId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'fixId and designId are required'
        }
      });
    }

    // Get fix suggestion from database
    const fixSuggestion = await FixSuggestion.getFixSuggestionById(fixId);
    
    if (!fixSuggestion) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FIX_NOT_FOUND',
          message: `Fix suggestion with id ${fixId} not found`
        }
      });
    }

    if (fixSuggestion.applied) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FIX_ALREADY_APPLIED',
          message: 'This fix has already been applied'
        }
      });
    }

    const fix = fixSuggestion.fix_data;

    // Generate Adobe Express SDK commands dynamically
    const designData = {
      layers: req.body.design?.layers || [],
      canvas: req.body.design?.canvas || {}
    };

    const commands = await fixApplicator.generateFixCommands(fix, designData);

    // Mark fix as applied
    await FixSuggestion.markFixAsApplied(fixId);

    res.json({
      success: true,
      data: {
        commands, // Adobe Express SDK commands to execute
        fix,
        metadata: {
          fixId,
          designId,
          appliedAt: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error applying fix:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FIX_APPLICATION_ERROR',
        message: error.message || 'Failed to apply fix'
      }
    });
  }
});

/**
 * POST /api/fixes/preview
 * Get preview data for a fix (what will change)
 * 
 * Request body:
 * {
 *   "fixId": "string",
 *   "designId": "string"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "preview": { ... },
 *     "changes": [...]
 *   }
 * }
 */
router.post('/preview', async (req, res) => {
  try {
    const { fixId, designId } = req.body;

    if (!fixId || !designId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'fixId and designId are required'
        }
      });
    }

    // Get fix suggestion
    const fixSuggestion = await FixSuggestion.getFixSuggestionById(fixId);
    
    if (!fixSuggestion) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FIX_NOT_FOUND',
          message: `Fix suggestion with id ${fixId} not found`
        }
      });
    }

    const fix = fixSuggestion.fix_data;

    // Generate preview data
    const preview = {
      elementId: fix.elementId,
      fixType: fix.type,
      currentValue: fix.currentValue,
      recommendedValue: fix.recommendedValue, // From database
      changes: {
        property: getPropertyForFixType(fix.type),
        before: fix.currentValue,
        after: fix.recommendedValue // From database
      },
      reasoning: fix.reasoning,
      metadata: fix.metadata
    };

    res.json({
      success: true,
      data: {
        preview,
        fix
      }
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PREVIEW_ERROR',
        message: error.message || 'Failed to generate preview'
      }
    });
  }
});

/**
 * POST /api/fixes/apply-all
 * Apply multiple fixes in batch
 * 
 * Request body:
 * {
 *   "fixIds": ["string", ...],
 *   "designId": "string",
 *   "design": { ... }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "commands": [...],
 *     "appliedFixes": number,
 *     "failedFixes": number
 *   }
 * }
 */
router.post('/apply-all', async (req, res) => {
  try {
    const { fixIds, designId, design } = req.body;

    if (!fixIds || !Array.isArray(fixIds) || fixIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'fixIds array is required and must not be empty'
        }
      });
    }

    if (!designId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'designId is required'
        }
      });
    }

    const allCommands = [];
    const appliedFixes = [];
    const failedFixes = [];

    // Process each fix
    for (const fixId of fixIds) {
      try {
        const fixSuggestion = await FixSuggestion.getFixSuggestionById(fixId);
        
        if (!fixSuggestion || fixSuggestion.applied) {
          failedFixes.push({ fixId, reason: 'Not found or already applied' });
          continue;
        }

        const fix = fixSuggestion.fix_data;
        
        if (!fix.autoFixable) {
          failedFixes.push({ fixId, reason: 'Not auto-fixable' });
          continue;
        }

        // Generate commands
        const designData = {
          layers: design?.layers || [],
          canvas: design?.canvas || {}
        };

        const commands = await fixApplicator.generateFixCommands(fix, designData);
        allCommands.push(...commands);

        // Mark as applied
        await FixSuggestion.markFixAsApplied(fixId);
        appliedFixes.push(fixId);
      } catch (error) {
        console.error(`Error processing fix ${fixId}:`, error);
        failedFixes.push({ fixId, reason: error.message });
      }
    }

    res.json({
      success: true,
      data: {
        commands: allCommands, // Batch of Adobe Express SDK commands
        appliedFixes: appliedFixes.length,
        failedFixes: failedFixes.length,
        details: {
          applied: appliedFixes,
          failed: failedFixes
        },
        metadata: {
          designId,
          appliedAt: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error applying batch fixes:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BATCH_APPLICATION_ERROR',
        message: error.message || 'Failed to apply batch fixes'
      }
    });
  }
});

/**
 * GET /api/fixes/:designId
 * Get all fix suggestions for a design
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "fixes": [...]
 *   }
 * }
 */
router.get('/:designId', async (req, res) => {
  try {
    const { designId } = req.params;

    const fixSuggestions = await FixSuggestion.getFixSuggestionsByDesign(designId);

    res.json({
      success: true,
      data: {
        fixes: fixSuggestions.map(fs => ({
          ...fs.fix_data,
          id: fs.id,
          applied: fs.applied,
          appliedAt: fs.applied_at,
          createdAt: fs.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching fix suggestions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error.message || 'Failed to fetch fix suggestions'
      }
    });
  }
});

/**
 * Helper function to map fix type to property name
 * @private
 */
function getPropertyForFixType(fixType) {
  const mapping = {
    'color': 'fill',
    'typography': 'fontFamily',
    'font_size': 'fontSize',
    'logo_size': 'width',
    'contrast': 'textColor',
    'spacing': 'margin'
  };
  
  return mapping[fixType] || fixType;
}

module.exports = router;
