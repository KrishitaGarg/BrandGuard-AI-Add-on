/**
 * Brand Guideline Model
 * 
 * Represents brand standards stored in the database.
 * This is an abstraction layer - can be backed by PostgreSQL, MongoDB, etc.
 * 
 * Structure matches database schema:
 * - id: UUID
 * - brand_id: UUID (references brands table)
 * - guideline_type: 'color' | 'typography' | 'logo' | 'spacing' | 'imagery' | 'layout'
 * - rules: JSONB object with dynamic structure based on type
 * - priority: INTEGER (1-10, higher = more important)
 * - created_at: TIMESTAMP
 * - updated_at: TIMESTAMP
 */

// In-memory storage for development (replace with real database in production)
let brandGuidelinesStore = [];

/**
 * Initialize with seed data if store is empty
 */
function initializeSeedData() {
  if (brandGuidelinesStore.length === 0) {
    // Sample brand guidelines - these would come from database in production
    brandGuidelinesStore = [
      {
        id: 'guideline-001',
        brand_id: 'default-brand',
        guideline_type: 'color',
        rules: {
          palette: [
            { name: 'Primary Blue', hex: '#0057B8', type: 'primary', usage: 'main brand color' },
            { name: 'Secondary Yellow', hex: '#FFD100', type: 'secondary', usage: 'accent color' },
            { name: 'Black', hex: '#1A1A1A', type: 'neutral', usage: 'text and dark elements' },
            { name: 'White', hex: '#FFFFFF', type: 'neutral', usage: 'background and light elements' },
          ],
          restrictions: {
            allowGrayscale: true,
            allowGradient: false,
            minContrastRatio: 4.5
          }
        },
        priority: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'guideline-002',
        brand_id: 'default-brand',
        guideline_type: 'typography',
        rules: {
          primaryFont: { family: 'Inter', fallbacks: ['Arial', 'Helvetica Neue', 'sans-serif'] },
          secondaryFont: { family: 'Georgia', fallbacks: ['serif'] },
          sizes: {
            heading1: { min: 32, max: 48, default: 40, unit: 'px' },
            heading2: { min: 24, max: 36, default: 32, unit: 'px' },
            body: { min: 14, max: 18, default: 16, unit: 'px' },
            caption: { min: 12, max: 14, default: 12, unit: 'px' }
          },
          weights: { allowed: [400, 500, 700], default: 400 },
          lineHeight: { min: 1.2, max: 1.8, default: 1.5 },
          letterSpacing: { min: -0.5, max: 2, default: 0, unit: 'px' }
        },
        priority: 9,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'guideline-003',
        brand_id: 'default-brand',
        guideline_type: 'logo',
        rules: {
          minWidth: 100,
          minHeight: 50,
          maxWidth: 500,
          maxHeight: 250,
          aspectRatio: { min: 1.5, max: 2.5, preferred: 2.0 },
          clearSpace: { min: 20, unit: 'px' },
          placement: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center']
        },
        priority: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'guideline-004',
        brand_id: 'default-brand',
        guideline_type: 'spacing',
        rules: {
          grid: { baseUnit: 8, multiplier: [1, 2, 3, 4, 6, 8] },
          margins: { min: 16, default: 24, max: 48, unit: 'px' },
          padding: { min: 8, default: 16, max: 32, unit: 'px' },
          gaps: { min: 8, default: 16, max: 24, unit: 'px' }
        },
        priority: 7,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }
}

/**
 * Get all brand guidelines for a specific brand
 * @param {string} brandId - Brand identifier
 * @returns {Promise<Array>} Array of brand guidelines
 */
async function getBrandGuidelines(brandId) {
  initializeSeedData();
  
  // In production, this would query: SELECT * FROM brand_guidelines WHERE brand_id = $1
  return brandGuidelinesStore.filter(g => g.brand_id === brandId);
}

/**
 * Get brand guidelines by type
 * @param {string} brandId - Brand identifier
 * @param {string} guidelineType - Type of guideline ('color', 'typography', etc.)
 * @returns {Promise<Object|null>} Guideline object or null
 */
async function getBrandGuidelineByType(brandId, guidelineType) {
  initializeSeedData();
  
  // In production: SELECT * FROM brand_guidelines WHERE brand_id = $1 AND guideline_type = $2 LIMIT 1
  const guideline = brandGuidelinesStore.find(
    g => g.brand_id === brandId && g.guideline_type === guidelineType
  );
  
  return guideline || null;
}

/**
 * Create or update a brand guideline
 * @param {Object} guidelineData - Guideline data
 * @returns {Promise<Object>} Created/updated guideline
 */
async function upsertBrandGuideline(guidelineData) {
  initializeSeedData();
  
  const existing = brandGuidelinesStore.find(
    g => g.id === guidelineData.id || 
         (g.brand_id === guidelineData.brand_id && g.guideline_type === guidelineData.guideline_type)
  );
  
  if (existing) {
    // Update
    Object.assign(existing, guidelineData, { updated_at: new Date().toISOString() });
    return existing;
  } else {
    // Create
    const newGuideline = {
      ...guidelineData,
      id: guidelineData.id || `guideline-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    brandGuidelinesStore.push(newGuideline);
    return newGuideline;
  }
}

/**
 * Delete a brand guideline
 * @param {string} guidelineId - Guideline ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteBrandGuideline(guidelineId) {
  initializeSeedData();
  
  const index = brandGuidelinesStore.findIndex(g => g.id === guidelineId);
  if (index !== -1) {
    brandGuidelinesStore.splice(index, 1);
    return true;
  }
  return false;
}

module.exports = {
  getBrandGuidelines,
  getBrandGuidelineByType,
  upsertBrandGuideline,
  deleteBrandGuideline
};
