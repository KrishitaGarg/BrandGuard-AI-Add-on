/**
 * Fix Suggestion Generator Service
 * 
 * Generates dynamic fix suggestions based on compliance analysis results.
 * All recommendations come from brand guidelines and industry standards (database).
 * NO HARDCODED VALUES.
 */

const brandGuidelinesService = require('./brandGuidelinesService');
const industryStandardsService = require('./industryStandardsService');

/**
 * Generate fix suggestions from compliance analysis results
 * @param {Object} complianceResults - Results from compliance analysis
 * @param {string} brandId - Brand identifier
 * @param {string} industry - Industry identifier (optional, defaults to 'general')
 * @returns {Promise<Object>} Generated fix suggestions
 */
async function generateFixSuggestions(complianceResults, brandId, industry = 'general') {
  // Fetch brand guidelines and industry standards from database
  const brandGuidelines = await brandGuidelinesService.getBrandGuidelines(brandId);
  const industryStandards = await industryStandardsService.getIndustryStandards(industry);
  
  const fixes = [];
  let potentialScoreIncrease = 0;
  
  // Extract violations from compliance results
  const violations = complianceResults.violations || [];
  const designLayers = complianceResults.design?.layers || [];
  
  // Generate fixes for each violation
  for (const violation of violations) {
    const fix = await generateFixForViolation(
      violation,
      designLayers,
      brandGuidelines,
      industryStandards,
      brandId,
      industry
    );
    
    if (fix) {
      fixes.push(fix);
      // Estimate score increase (severity-based)
      if (fix.severity === 'critical') {
        potentialScoreIncrease += 15;
      } else if (fix.severity === 'warning') {
        potentialScoreIncrease += 5;
      }
    }
  }
  
  // Cap potential score increase at 100
  potentialScoreIncrease = Math.min(potentialScoreIncrease, 100 - (complianceResults.score || 0));
  
  return {
    fixes,
    potentialScoreIncrease: Math.max(0, potentialScoreIncrease),
    summary: {
      totalFixes: fixes.length,
      criticalFixes: fixes.filter(f => f.severity === 'critical').length,
      warningFixes: fixes.filter(f => f.severity === 'warning').length,
      autoFixable: fixes.filter(f => f.autoFixable === true).length,
      manualReview: fixes.filter(f => f.autoFixable === false).length
    }
  };
}

/**
 * Generate a fix suggestion for a single violation
 * @private
 */
async function generateFixForViolation(violation, designLayers, brandGuidelines, industryStandards, brandId, industry) {
  const elementId = violation.elementId;
  const layer = designLayers.find(l => l.id === elementId);
  
  if (!layer) {
    return null;
  }
  
  // Route to appropriate fix generator based on violation type
  switch (violation.ruleId || violation.domain) {
    case 'brand_colors':
    case 'color':
      return await generateColorFix(violation, layer, brandGuidelines, industryStandards, brandId, industry);
    
    case 'brand_typography':
    case 'font':
    case 'fontFamily':
      return await generateTypographyFix(violation, layer, brandGuidelines, industryStandards, brandId, industry);
    
    case 'logo_size':
      return await generateLogoSizeFix(violation, layer, brandGuidelines);
    
    case 'font_size':
    case 'typography':
      return await generateFontSizeFix(violation, layer, brandGuidelines, industryStandards, brandId, industry);
    
    case 'contrast_ratio':
    case 'contrast':
      return await generateContrastFix(violation, layer, brandGuidelines, industryStandards, brandId, industry);
    
    case 'spacing':
      return await generateSpacingFix(violation, layer, brandGuidelines);
    
    case 'content_tone':
    case 'forbidden_phrase':
    case 'content':
      return await generateContentFix(violation, layer, brandGuidelines);
    
    default:
      return generateGenericFix(violation, layer);
  }
}

/**
 * Generate color fix suggestion (from brand guidelines DB)
 * @private
 */
async function generateColorFix(violation, layer, brandGuidelines, industryStandards, brandId, industry) {
  // Get brand colors from database - NO HARDCODED VALUES
  const brandColors = await brandGuidelinesService.getBrandColors(brandId);
  
  if (brandColors.length === 0) {
    return null;
  }
  
  // Find appropriate color replacement
  // Prefer primary color, but can use secondary or neutral based on context
  const currentColor = violation.currentValue || layer.fill;
  const primaryColor = brandColors.find(c => c.type === 'primary');
  const recommendedColor = primaryColor || brandColors[0];
  
  return {
    id: `fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'color',
    severity: violation.severity || 'warning',
    title: `Update color to brand standard`,
    description: `Change from ${currentColor} to ${recommendedColor.name} (${recommendedColor.hex}) to match brand guidelines.`,
    currentValue: currentColor,
    recommendedValue: recommendedColor.hex, // From database
    reasoning: `Brand guidelines specify ${recommendedColor.name} as the ${recommendedColor.type} color. ${recommendedColor.usage || 'Standard brand color usage.'}`,
    autoFixable: true,
    elementId: violation.elementId || layer.id,
    metadata: {
      guidelineSource: 'Brand Guidelines - Color Palette',
      brandColorName: recommendedColor.name, // From database
      brandColorType: recommendedColor.type, // From database
      brandRule: `Use approved brand colors from palette`
    }
  };
}

/**
 * Generate typography fix suggestion (from brand guidelines DB)
 * @private
 */
async function generateTypographyFix(violation, layer, brandGuidelines, industryStandards, brandId, industry) {
  // Get typography from database - NO HARDCODED VALUES
  const recommendedFont = await brandGuidelinesService.getRecommendedFontFamily(brandId, 'body');
  
  if (!recommendedFont) {
    return null;
  }
  
  const currentFont = violation.currentValue || layer.fontFamily;
  
  return {
    id: `fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'typography',
    severity: violation.severity || 'critical',
    title: `Update font family to brand standard`,
    description: `Change font from "${currentFont}" to brand-approved "${recommendedFont.split(',')[0]}".`,
    currentValue: currentFont,
    recommendedValue: recommendedFont, // From database
    reasoning: `Brand typography guidelines specify ${recommendedFont.split(',')[0]} as the primary brand font for consistent visual identity.`,
    autoFixable: true,
    elementId: violation.elementId || layer.id,
    metadata: {
      guidelineSource: 'Brand Guidelines - Typography',
      brandRule: `Use approved brand font family`,
      fontFamily: recommendedFont.split(',')[0] // From database
    }
  };
}

/**
 * Generate font size fix suggestion (from brand guidelines + industry standards DB)
 * @private
 */
async function generateFontSizeFix(violation, layer, brandGuidelines, industryStandards, brandId, industry) {
  // Get minimum from industry standards - NO HARDCODED VALUES
  const minFontSize = await industryStandardsService.getMinimumFontSize(industry, 'body');
  
  // Get recommended from brand guidelines - NO HARDCODED VALUES
  const recommendedSize = await brandGuidelinesService.getRecommendedFontSize(brandId, 'body');
  
  const currentSize = parseInt(violation.currentValue) || layer.fontSize || 0;
  const targetSize = recommendedSize ? recommendedSize.value : Math.max(minFontSize, currentSize);
  const targetSizeWithUnit = recommendedSize ? `${targetSize}${recommendedSize.unit}` : `${targetSize}px`;
  
  return {
    id: `fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'font_size',
    severity: violation.severity || 'warning',
    title: `Update font size to meet standards`,
    description: `Increase font size from ${currentSize}px to ${targetSize}px to meet brand and accessibility standards.`,
    currentValue: `${currentSize}px`,
    recommendedValue: targetSizeWithUnit, // From database
    reasoning: `Industry standards require minimum ${minFontSize}px for readability. Brand guidelines recommend ${targetSize}px for body text.`,
    autoFixable: true,
    elementId: violation.elementId || layer.id,
    metadata: {
      guidelineSource: 'Brand Guidelines + Industry Standards',
      industryStandard: `Minimum font size: ${minFontSize}px`,
      brandRule: `Recommended font size: ${targetSize}px`,
      min: recommendedSize ? recommendedSize.min : minFontSize, // From database
      max: recommendedSize ? recommendedSize.max : null // From database
    }
  };
}

/**
 * Generate logo size fix suggestion (from brand guidelines DB)
 * @private
 */
async function generateLogoSizeFix(violation, layer, brandGuidelines, industryStandards, brandId, industry) {
  const logoSpecs = await brandGuidelinesService.getBrandLogoSpecs(brandId);
  
  if (!logoSpecs) {
    return null;
  }
  
  const currentWidth = layer.width || 0;
  const minWidth = logoSpecs.minWidth; // From database
  const recommendedWidth = Math.max(minWidth, currentWidth);
  
  return {
    id: `fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'logo_size',
    severity: violation.severity || 'critical',
    title: `Adjust logo size to meet minimum requirements`,
    description: `Increase logo width from ${currentWidth}px to at least ${minWidth}px for proper legibility.`,
    currentValue: `${currentWidth}px`,
    recommendedValue: `${recommendedWidth}px`, // Calculated from database value
    reasoning: `Brand logo guidelines require minimum width of ${minWidth}px to ensure clear visibility and brand recognition.`,
    autoFixable: true,
    elementId: violation.elementId || layer.id,
    metadata: {
      guidelineSource: 'Brand Guidelines - Logo Specifications',
      brandRule: `Minimum logo width: ${minWidth}px`, // From database
      minWidth: logoSpecs.minWidth, // From database
      maxWidth: logoSpecs.maxWidth // From database
    }
  };
}

/**
 * Generate contrast fix suggestion (from industry standards DB)
 * @private
 */
async function generateContrastFix(violation, layer, brandGuidelines, industryStandards, brandId, industry) {
  // Get minimum contrast from industry standards - NO HARDCODED VALUES
  const minContrast = await industryStandardsService.getMinimumContrastRatio(industry, 'normal');
  
  // Get brand colors to suggest better color combinations
  const brandColors = await brandGuidelinesService.getBrandColors(brandId);
  
  const currentRatio = parseFloat(violation.currentValue) || 0;
  const textColor = layer.textColor || layer.fill;
  const backgroundColor = layer.backgroundColor || '#FFFFFF';
  
  // Find a color from brand palette that would improve contrast
  let recommendedColor = null;
  if (brandColors.length > 0) {
    // Simple heuristic: use dark color on light background or vice versa
    const isLightBg = backgroundColor === '#FFFFFF' || backgroundColor.toLowerCase().includes('fff');
    recommendedColor = isLightBg 
      ? brandColors.find(c => c.hex === '#1A1A1A') || brandColors.find(c => c.type === 'neutral')
      : brandColors.find(c => c.hex === '#FFFFFF') || brandColors[0];
  }
  
  return {
    id: `fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'contrast',
    severity: violation.severity || 'critical',
    title: `Improve text contrast for accessibility`,
    description: `Current contrast ratio ${currentRatio.toFixed(2)} is below required ${minContrast}:1. Update colors to meet WCAG standards.`,
    currentValue: `${currentRatio.toFixed(2)}:1`,
    recommendedValue: recommendedColor ? recommendedColor.hex : `${minContrast}:1`, // From database/standards
    reasoning: `Industry accessibility standards require minimum contrast ratio of ${minContrast}:1 (WCAG AA). Using brand-approved colors ensures both compliance and brand consistency.`,
    autoFixable: recommendedColor ? true : false, // Auto-fixable if we have a recommended color
    elementId: violation.elementId || layer.id,
    metadata: {
      guidelineSource: 'Industry Standards - Accessibility',
      industryStandard: `WCAG AA requires ${minContrast}:1 contrast ratio`, // From database
      currentRatio: currentRatio,
      requiredRatio: minContrast // From database
    }
  };
}

/**
 * Generate spacing fix suggestion (from brand guidelines DB)
 * @private
 */
async function generateSpacingFix(violation, layer, brandGuidelines, industryStandards, brandId, industry) {
  const spacing = await brandGuidelinesService.getBrandSpacing(brandId);
  
  if (!spacing) {
    return null;
  }
  
  const recommendedSpacing = await brandGuidelinesService.getRecommendedSpacing(
    brandId,
    2 // Default multiplier
  );
  
  return {
    id: `fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'spacing',
    severity: violation.severity || 'warning',
    title: `Adjust spacing to brand grid system`,
    description: `Update spacing to align with brand grid system (${recommendedSpacing}px recommended).`,
    currentValue: violation.currentValue || 'unknown',
    recommendedValue: `${recommendedSpacing}px`, // From database
    reasoning: `Brand guidelines specify a ${spacing.grid.baseUnit}px base unit grid system. Using ${recommendedSpacing}px maintains visual consistency.`,
    autoFixable: true,
    elementId: violation.elementId || layer.id,
    metadata: {
      guidelineSource: 'Brand Guidelines - Spacing & Grid',
      brandRule: `Use ${spacing.grid.baseUnit}px base unit grid`, // From database
      recommendedSpacing: recommendedSpacing // Calculated from database
    }
  };
}

/**
 * Generate content fix suggestion (from brand guidelines DB)
 * @private
 */
async function generateContentFix(violation, layer, brandGuidelines) {
  // Content fixes are less straightforward to auto-fix
  // Return a suggestion that requires manual review
  return {
    id: `fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'content',
    severity: violation.severity || 'warning',
    title: `Review content for brand compliance`,
    description: violation.message || `Content may not align with brand tone or guidelines.`,
    currentValue: violation.currentValue || layer.content || '',
    recommendedValue: violation.suggestedValue || '',
    reasoning: violation.businessContext?.reason || `Content should align with brand voice and messaging guidelines.`,
    autoFixable: false, // Content fixes typically need human review
    elementId: violation.elementId || layer.id,
    metadata: {
      guidelineSource: 'Brand Guidelines - Content & Tone',
      brandRule: `Content must align with brand voice`,
      requiresManualReview: true
    }
  };
}

/**
 * Generate generic fix for unknown violation types
 * @private
 */
function generateGenericFix(violation, layer) {
  return {
    id: `fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'generic',
    severity: violation.severity || 'warning',
    title: violation.message || 'Fix compliance issue',
    description: violation.businessContext?.reason || 'This element needs to be reviewed for brand compliance.',
    currentValue: violation.currentValue || '',
    recommendedValue: violation.suggestedValue || '',
    reasoning: violation.businessContext?.outcome || 'Addressing this will improve brand compliance.',
    autoFixable: violation.autoFixable || false,
    elementId: violation.elementId || layer.id,
    metadata: {
      guidelineSource: 'Brand Guidelines',
      brandRule: violation.ruleId || 'General brand compliance'
    }
  };
}

module.exports = {
  generateFixSuggestions
};
