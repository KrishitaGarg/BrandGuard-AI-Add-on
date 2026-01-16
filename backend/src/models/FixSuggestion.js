/**
 * Fix Suggestion Model
 * 
 * Represents generated fix suggestions that can be cached and tracked.
 * 
 * Structure matches database schema:
 * - id: UUID
 * - design_id: UUID (references designs table)
 * - brand_id: UUID (references brands table)
 * - fix_data: JSONB (complete fix object)
 * - applied: BOOLEAN (default: false)
 * - applied_at: TIMESTAMP (nullable)
 * - created_at: TIMESTAMP
 */

// In-memory storage for development (replace with real database in production)
let fixSuggestionsStore = [];

/**
 * Save a fix suggestion
 * @param {Object} fixData - Complete fix suggestion data
 * @param {string} designId - Design identifier
 * @param {string} brandId - Brand identifier
 * @returns {Promise<Object>} Saved fix suggestion with ID
 */
async function saveFixSuggestion(fixData, designId, brandId) {
  const fixSuggestion = {
    id: `fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    design_id: designId,
    brand_id: brandId,
    fix_data: fixData,
    applied: false,
    applied_at: null,
    created_at: new Date().toISOString()
  };
  
  fixSuggestionsStore.push(fixSuggestion);
  return fixSuggestion;
}

/**
 * Get all fix suggestions for a design
 * @param {string} designId - Design identifier
 * @returns {Promise<Array>} Array of fix suggestions
 */
async function getFixSuggestionsByDesign(designId) {
  // In production: SELECT * FROM fix_suggestions WHERE design_id = $1 ORDER BY created_at DESC
  return fixSuggestionsStore.filter(f => f.design_id === designId);
}

/**
 * Get a specific fix suggestion by ID
 * @param {string} fixId - Fix suggestion ID
 * @returns {Promise<Object|null>} Fix suggestion or null
 */
async function getFixSuggestionById(fixId) {
  // In production: SELECT * FROM fix_suggestions WHERE id = $1 LIMIT 1
  return fixSuggestionsStore.find(f => f.id === fixId) || null;
}

/**
 * Mark a fix suggestion as applied
 * @param {string} fixId - Fix suggestion ID
 * @returns {Promise<Object|null>} Updated fix suggestion or null
 */
async function markFixAsApplied(fixId) {
  // In production: UPDATE fix_suggestions SET applied = true, applied_at = NOW() WHERE id = $1
  const fix = fixSuggestionsStore.find(f => f.id === fixId);
  if (fix) {
    fix.applied = true;
    fix.applied_at = new Date().toISOString();
    return fix;
  }
  return null;
}

/**
 * Get applied fixes for a design
 * @param {string} designId - Design identifier
 * @returns {Promise<Array>} Array of applied fixes
 */
async function getAppliedFixes(designId) {
  // In production: SELECT * FROM fix_suggestions WHERE design_id = $1 AND applied = true
  return fixSuggestionsStore.filter(f => f.design_id === designId && f.applied === true);
}

/**
 * Delete fix suggestions for a design (cleanup)
 * @param {string} designId - Design identifier
 * @returns {Promise<number>} Number of deleted suggestions
 */
async function deleteFixSuggestionsByDesign(designId) {
  const initialLength = fixSuggestionsStore.length;
  fixSuggestionsStore = fixSuggestionsStore.filter(f => f.design_id !== designId);
  return initialLength - fixSuggestionsStore.length;
}

module.exports = {
  saveFixSuggestion,
  getFixSuggestionsByDesign,
  getFixSuggestionById,
  markFixAsApplied,
  getAppliedFixes,
  deleteFixSuggestionsByDesign
};
