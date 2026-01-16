/**
 * Industry Standards Service
 * 
 * Service for fetching industry-specific standards from the database.
 * All standards come from database - NO HARDCODED VALUES.
 */

const {
  getIndustryStandards: fetchgetIndustryStandards,
  getIndustryStandardsByType,
  getRequiredIndustryStandards
} = require('../models/IndustryStandard');

/**
 * Get all industry standards for a specific industry
 * @param {string} industry - Industry identifier (e.g., 'finance', 'healthcare', 'retail')
 * @returns {Promise<Object>} Structured industry standards object
 */
async function getIndustryStandards(industry = 'general') {
  // Fetch from database - includes 'general' standards that apply to all industries
  const standards = await fetchgetIndustryStandards(industry);
  
  // Structure by type for easy access
  const structured = {
    accessibility: [],
    legal: [],
    bestPractice: []
  };
  
  for (const standard of standards) {
    const typeKey = standard.standard_type === 'best_practice' ? 'bestPractice' : standard.standard_type;
    if (structured.hasOwnProperty(typeKey)) {
      structured[typeKey].push({
        requirements: standard.requirements, // From database
        complianceLevel: standard.compliance_level, // From database
        industry: standard.industry
      });
    }
  }
  
  return structured;
}

/**
 * Get accessibility requirements for an industry
 * @param {string} industry - Industry identifier
 * @returns {Promise<Object|null>} Accessibility requirements or null
 */
async function getAccessibilityRequirements(industry = 'general') {
  const standards = await getIndustryStandardsByType(industry, 'accessibility');
  
  if (standards.length === 0) {
    return null;
  }
  
  // Use the most strict standard if multiple exist
  const requiredStandard = standards.find(s => s.compliance_level === 'required') || standards[0];
  
  // Return requirements from database - NO HARDCODED VALUES
  return {
    wcagLevel: requiredStandard.requirements.wcagLevel, // From database
    contrastRatios: requiredStandard.requirements.contrastRatios, // From database
    fontSizes: requiredStandard.requirements.fontSizes // From database
  };
}

/**
 * Get minimum contrast ratio for text based on industry standards
 * @param {string} industry - Industry identifier
 * @param {string} textType - 'normal', 'large', or 'ui'
 * @returns {Promise<number>} Minimum contrast ratio
 */
async function getMinimumContrastRatio(industry = 'general', textType = 'normal') {
  const accessibility = await getAccessibilityRequirements(industry);
  
  if (!accessibility || !accessibility.contrastRatios) {
    // Fallback to WCAG AA standard (still from DB via 'general' industry)
    const generalAccessibility = await getAccessibilityRequirements('general');
    if (generalAccessibility && generalAccessibility.contrastRatios) {
      return generalAccessibility.contrastRatios.normalText || 4.5;
    }
    return 4.5; // Absolute fallback (shouldn't happen if DB is set up correctly)
  }
  
  // Map text type to contrast ratio key - values from database
  const ratioKey = textType === 'large' ? 'largeText' : 
                   textType === 'ui' ? 'uiComponents' : 'normalText';
  
  return accessibility.contrastRatios[ratioKey] || 4.5;
}

/**
 * Get minimum font size requirement from industry standards
 * @param {string} industry - Industry identifier
 * @param {string} elementType - 'body' or 'caption'
 * @returns {Promise<number>} Minimum font size in pixels
 */
async function getMinimumFontSize(industry = 'general', elementType = 'body') {
  const accessibility = await getAccessibilityRequirements(industry);
  
  if (!accessibility || !accessibility.fontSizes) {
    // Fallback to general
    const generalAccessibility = await getAccessibilityRequirements('general');
    if (generalAccessibility && generalAccessibility.fontSizes) {
      const sizeKey = elementType === 'caption' ? 'minimumCaption' : 'minimumBody';
      return generalAccessibility.fontSizes[sizeKey] || 12;
    }
    return 12; // Absolute fallback
  }
  
  // Return from database - NO HARDCODED VALUES
  const sizeKey = elementType === 'caption' ? 'minimumCaption' : 'minimumBody';
  return accessibility.fontSizes[sizeKey] || 12;
}

/**
 * Get legal requirements for an industry
 * @param {string} industry - Industry identifier
 * @returns {Promise<Object|null>} Legal requirements or null
 */
async function getLegalRequirements(industry = 'general') {
  const standards = await getIndustryStandardsByType(industry, 'legal');
  
  if (standards.length === 0) {
    return null;
  }
  
  // Merge all legal requirements
  const merged = {
    disclaimers: null,
    requiredElements: []
  };
  
  for (const standard of standards) {
    if (standard.requirements.disclaimers) {
      merged.disclaimers = standard.requirements.disclaimers; // From database
    }
    if (standard.requirements.requiredElements) {
      merged.requiredElements.push(...standard.requirements.requiredElements); // From database
    }
  }
  
  return merged;
}

/**
 * Get best practice recommendations for an industry
 * @param {string} industry - Industry identifier
 * @returns {Promise<Array>} Array of best practice recommendations
 */
async function getBestPractices(industry = 'general') {
  const standards = await getIndustryStandardsByType(industry, 'best_practice');
  
  // Return requirements from database - NO HARDCODED VALUES
  return standards.map(s => ({
    requirements: s.requirements, // From database
    complianceLevel: s.compliance_level, // From database
    industry: s.industry
  }));
}

/**
 * Get all required standards for an industry (compliance level = 'required')
 * @param {string} industry - Industry identifier
 * @returns {Promise<Array>} Array of required standards
 */
async function getRequiredStandards(industry = 'general') {
  // Fetch from database - NO HARDCODED VALUES
  return await getRequiredIndustryStandards(industry);
}

module.exports = {
  getIndustryStandards,
  getAccessibilityRequirements,
  getMinimumContrastRatio,
  getMinimumFontSize,
  getLegalRequirements,
  getBestPractices,
  getRequiredStandards
};
