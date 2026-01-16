/**
 * Industry Standard Model
 * 
 * Represents industry-specific standards stored in the database.
 * These are configurable standards that apply across brands in the same industry.
 * 
 * Structure matches database schema:
 * - id: UUID
 * - industry: VARCHAR (e.g., 'finance', 'healthcare', 'retail', 'technology')
 * - standard_type: VARCHAR (e.g., 'accessibility', 'legal', 'best_practice')
 * - requirements: JSONB object with dynamic structure
 * - compliance_level: 'required' | 'recommended' | 'optional'
 * - created_at: TIMESTAMP
 */

// In-memory storage for development (replace with real database in production)
let industryStandardsStore = [];

/**
 * Initialize with seed data if store is empty
 */
function initializeSeedData() {
  if (industryStandardsStore.length === 0) {
    industryStandardsStore = [
      {
        id: 'industry-001',
        industry: 'finance',
        standard_type: 'accessibility',
        requirements: {
          wcagLevel: 'AA',
          contrastRatios: {
            normalText: 4.5,
            largeText: 3.0,
            uiComponents: 3.0
          },
          fontSizes: {
            minimumBody: 14,
            minimumCaption: 12,
            unit: 'px'
          }
        },
        compliance_level: 'required',
        created_at: new Date().toISOString()
      },
      {
        id: 'industry-002',
        industry: 'finance',
        standard_type: 'legal',
        requirements: {
          disclaimers: {
            required: true,
            minimumFontSize: 10,
            placement: ['footer', 'sidebar']
          },
          requiredElements: ['privacy_notice_link', 'terms_link']
        },
        compliance_level: 'required',
        created_at: new Date().toISOString()
      },
      {
        id: 'industry-003',
        industry: 'healthcare',
        standard_type: 'accessibility',
        requirements: {
          wcagLevel: 'AAA',
          contrastRatios: {
            normalText: 7.0,
            largeText: 4.5,
            uiComponents: 4.5
          },
          fontSizes: {
            minimumBody: 16,
            minimumCaption: 14,
            unit: 'px'
          }
        },
        compliance_level: 'required',
        created_at: new Date().toISOString()
      },
      {
        id: 'industry-004',
        industry: 'retail',
        standard_type: 'best_practice',
        requirements: {
          colorPsychology: {
            avoidRedForFinancialInfo: true,
            preferWarmColorsForCTAs: true
          },
          readability: {
            maxLineLength: 75,
            preferredFontSize: 16,
            unit: 'ch'
          }
        },
        compliance_level: 'recommended',
        created_at: new Date().toISOString()
      },
      {
        id: 'industry-005',
        industry: 'general',
        standard_type: 'accessibility',
        requirements: {
          wcagLevel: 'AA',
          contrastRatios: {
            normalText: 4.5,
            largeText: 3.0,
            uiComponents: 3.0
          },
          fontSizes: {
            minimumBody: 12,
            minimumCaption: 10,
            unit: 'px'
          }
        },
        compliance_level: 'recommended',
        created_at: new Date().toISOString()
      }
    ];
  }
}

/**
 * Get industry standards by industry name
 * @param {string} industry - Industry identifier (e.g., 'finance', 'healthcare')
 * @returns {Promise<Array>} Array of industry standards
 */
async function getIndustryStandards(industry) {
  initializeSeedData();
  
  // In production: SELECT * FROM industry_standards WHERE industry = $1 OR industry = 'general'
  // 'general' standards apply to all industries
  return industryStandardsStore.filter(
    s => s.industry === industry || s.industry === 'general'
  );
}

/**
 * Get industry standards by type
 * @param {string} industry - Industry identifier
 * @param {string} standardType - Type of standard ('accessibility', 'legal', etc.)
 * @returns {Promise<Array>} Array of matching standards
 */
async function getIndustryStandardsByType(industry, standardType) {
  initializeSeedData();
  
  // In production: SELECT * FROM industry_standards 
  // WHERE (industry = $1 OR industry = 'general') AND standard_type = $2
  return industryStandardsStore.filter(
    s => (s.industry === industry || s.industry === 'general') && 
         s.standard_type === standardType
  );
}

/**
 * Get all required standards for an industry
 * @param {string} industry - Industry identifier
 * @returns {Promise<Array>} Array of required standards only
 */
async function getRequiredIndustryStandards(industry) {
  initializeSeedData();
  
  // In production: SELECT * FROM industry_standards 
  // WHERE (industry = $1 OR industry = 'general') AND compliance_level = 'required'
  return industryStandardsStore.filter(
    s => (s.industry === industry || s.industry === 'general') && 
         s.compliance_level === 'required'
  );
}

/**
 * Create or update an industry standard
 * @param {Object} standardData - Standard data
 * @returns {Promise<Object>} Created/updated standard
 */
async function upsertIndustryStandard(standardData) {
  initializeSeedData();
  
  const existing = industryStandardsStore.find(
    s => s.id === standardData.id ||
         (s.industry === standardData.industry && s.standard_type === standardData.standard_type)
  );
  
  if (existing) {
    // Update
    Object.assign(existing, standardData);
    return existing;
  } else {
    // Create
    const newStandard = {
      ...standardData,
      id: standardData.id || `industry-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    industryStandardsStore.push(newStandard);
    return newStandard;
  }
}

module.exports = {
  getIndustryStandards,
  getIndustryStandardsByType,
  getRequiredIndustryStandards,
  upsertIndustryStandard
};
