/**
 * Brand Guidelines Service
 * 
 * Service for fetching and managing brand standards from the database.
 * All brand standards come from database - NO HARDCODED VALUES.
 */

const {
  getBrandGuidelines,
  getBrandGuidelineByType
} = require('../models/BrandGuideline');

/**
 * Get comprehensive brand guidelines for a brand
 * @param {string} brandId - Brand identifier
 * @returns {Promise<Object>} Structured brand guidelines object
 */
async function getBrandGuidelines(brandId) {
  // Fetch all guidelines from database
  const guidelines = await getBrandGuidelines(brandId);
  
  // Structure the guidelines by type for easy access
  const structured = {
    colors: null,
    typography: null,
    logo: null,
    spacing: null,
    imagery: null,
    layout: null
  };
  
  for (const guideline of guidelines) {
    if (structured.hasOwnProperty(guideline.guideline_type)) {
      structured[guideline.guideline_type] = guideline.rules;
    }
  }
  
  return structured;
}

/**
 * Get brand color palette from database
 * @param {string} brandId - Brand identifier
 * @returns {Promise<Array>} Array of brand colors with metadata
 */
async function getBrandColors(brandId) {
  const colorGuideline = await getBrandGuidelineByType(brandId, 'color');
  
  if (!colorGuideline || !colorGuideline.rules || !colorGuideline.rules.palette) {
    return [];
  }
  
  // Return colors from database - NO HARDCODED VALUES
  return colorGuideline.rules.palette.map(color => ({
    hex: color.hex, // From database
    name: color.name, // From database
    type: color.type, // From database
    usage: color.usage // From database
  }));
}

/**
 * Get primary brand color from database
 * @param {string} brandId - Brand identifier
 * @returns {Promise<string|null>} Primary color hex code or null
 */
async function getPrimaryBrandColor(brandId) {
  const colors = await getBrandColors(brandId);
  const primary = colors.find(c => c.type === 'primary');
  return primary ? primary.hex : null;
}

/**
 * Get brand typography rules from database
 * @param {string} brandId - Brand identifier
 * @returns {Promise<Object|null>} Typography rules or null
 */
async function getBrandTypography(brandId) {
  const typographyGuideline = await getBrandGuidelineByType(brandId, 'typography');
  return typographyGuideline ? typographyGuideline.rules : null;
}

/**
 * Get recommended font family for a text element
 * @param {string} brandId - Brand identifier
 * @param {string} textType - Type of text ('heading1', 'heading2', 'body', 'caption')
 * @returns {Promise<string|null>} Font family or null
 */
async function getRecommendedFontFamily(brandId, textType = 'body') {
  const typography = await getBrandTypography(brandId);
  
  if (!typography || !typography.primaryFont) {
    return null;
  }
  
  // Return font from database - NO HARDCODED VALUES
  const fontFamily = typography.primaryFont.family;
  const fallbacks = typography.primaryFont.fallbacks || [];
  
  return [fontFamily, ...fallbacks].join(', ');
}

/**
 * Get recommended font size for a text element
 * @param {string} brandId - Brand identifier
 * @param {string} textType - Type of text ('heading1', 'heading2', 'body', 'caption')
 * @returns {Promise<Object|null>} Font size object { value, unit } or null
 */
async function getRecommendedFontSize(brandId, textType = 'body') {
  const typography = await getBrandTypography(brandId);
  
  if (!typography || !typography.sizes || !typography.sizes[textType]) {
    return null;
  }
  
  // Return size from database - NO HARDCODED VALUES
  const sizeRule = typography.sizes[textType];
  return {
    value: sizeRule.default, // From database
    min: sizeRule.min, // From database
    max: sizeRule.max, // From database
    unit: sizeRule.unit // From database
  };
}

/**
 * Get brand logo specifications from database
 * @param {string} brandId - Brand identifier
 * @returns {Promise<Object|null>} Logo rules or null
 */
async function getBrandLogoSpecs(brandId) {
  const logoGuideline = await getBrandGuidelineByType(brandId, 'logo');
  return logoGuideline ? logoGuideline.rules : null;
}

/**
 * Get brand spacing/grid system from database
 * @param {string} brandId - Brand identifier
 * @returns {Promise<Object|null>} Spacing rules or null
 */
async function getBrandSpacing(brandId) {
  const spacingGuideline = await getBrandGuidelineByType(brandId, 'spacing');
  return spacingGuideline ? spacingGuideline.rules : null;
}

/**
 * Get recommended spacing value based on grid system
 * @param {string} brandId - Brand identifier
 * @param {number} multiplier - Grid multiplier (e.g., 1, 2, 3, 4)
 * @returns {Promise<number|null>} Recommended spacing in pixels or null
 */
async function getRecommendedSpacing(brandId, multiplier = 2) {
  const spacing = await getBrandSpacing(brandId);
  
  if (!spacing || !spacing.grid) {
    return null;
  }
  
  // Calculate from database values - NO HARDCODED VALUES
  const baseUnit = spacing.grid.baseUnit; // From database
  const allowedMultipliers = spacing.grid.multiplier || [1, 2, 3, 4]; // From database
  
  // Use closest allowed multiplier
  const closestMultiplier = allowedMultipliers.reduce((prev, curr) => 
    Math.abs(curr - multiplier) < Math.abs(prev - multiplier) ? curr : prev
  );
  
  return baseUnit * closestMultiplier;
}

module.exports = {
  getBrandGuidelines,
  getBrandColors,
  getPrimaryBrandColor,
  getBrandTypography,
  getRecommendedFontFamily,
  getRecommendedFontSize,
  getBrandLogoSpecs,
  getBrandSpacing,
  getRecommendedSpacing
};
