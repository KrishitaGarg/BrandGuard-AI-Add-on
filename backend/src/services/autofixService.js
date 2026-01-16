/**
 * Autofix Service
 * 
 * Applies deterministic fixes to text content based on brand guidelines.
 * No AI guessing - uses simple replacement rules.
 */

/**
 * Apply autofix to text content
 * 
 * @param {Object} input
 * @param {string} input.text - Original text content
 * @param {Array} input.issues - Issues from compliance analysis
 * @param {Object} input.brandGuidelines
 * @param {Object} input.brandGuidelines.preferredTerms - Map of non-preferred -> preferred terms
 * @param {Array} input.brandGuidelines.disallowedTerms - Terms that must be replaced/removed
 * @param {Array} input.brandGuidelines.toneRules - Tone-related rules
 * @returns {Object} { fixedText, appliedFixes }
 */
function applyAutofix(input) {
  const { text, issues, brandGuidelines } = input;

  if (!text || typeof text !== 'string') {
    return {
      fixedText: text || '',
      appliedFixes: [],
      error: 'Invalid text input'
    };
  }

  let fixedText = text;
  const appliedFixes = [];

  // Convert preferredTerms array to map if needed
  // If preferredTerms is an array, create a simple mapping
  // If it's an object/Map, use it directly
  const preferredTermsMap = {};
  if (Array.isArray(brandGuidelines?.preferredTerms)) {
    // Array format: ['term1', 'term2'] - we need pairs
    // For now, we'll use issues to find replacements
  } else if (brandGuidelines?.preferredTerms) {
    Object.assign(preferredTermsMap, brandGuidelines.preferredTerms);
  }

  const disallowedTerms = Array.isArray(brandGuidelines?.disallowedTerms) 
    ? brandGuidelines.disallowedTerms 
    : [];

  // 1. Remove/replace disallowed terms FIRST (MUST be replaced - highest priority)
  for (const term of disallowedTerms) {
    if (!term || typeof term !== 'string') continue;
    
    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'gi');
    if (regex.test(fixedText)) {
      const replacement = findReplacement(term, preferredTermsMap, disallowedTerms);
      const newText = fixedText.replace(regex, replacement || '[removed]');
      
      if (newText !== fixedText) {
        appliedFixes.push({
          type: 'disallowed_term_removal',
          issue: `Removed/replaced disallowed term: "${term}"`,
          before: fixedText,
          after: newText,
          applied: true
        });
        fixedText = newText;
      }
    }
  }

  // 2. Apply preferred term replacements (deterministic)
  if (Object.keys(preferredTermsMap).length > 0) {
    for (const [nonPreferred, preferred] of Object.entries(preferredTermsMap)) {
      if (!nonPreferred || !preferred) continue;
      const regex = new RegExp(`\\b${escapeRegExp(nonPreferred)}\\b`, 'gi');
      if (regex.test(fixedText) && nonPreferred.toLowerCase() !== preferred.toLowerCase()) {
        const newText = fixedText.replace(regex, preferred);
        if (newText !== fixedText) {
          appliedFixes.push({
            type: 'preferred_term_replacement',
            issue: `Replaced "${nonPreferred}" with preferred term "${preferred}"`,
            before: fixedText,
            after: newText,
            applied: true
          });
          fixedText = newText;
        }
      }
    }
  }

  // 3. Apply fixes from issues (tone fixes, AI rewrite suggestions)
  // These come from compliance analysis and may include rewrite suggestions
  for (const issue of issues || []) {
    if (issue.rewriteSuggestions && issue.rewriteSuggestions.length > 0) {
      // Use the first rewrite suggestion (neutral or conservative style preferred)
      const suggestion = issue.rewriteSuggestions.find(s => s.style === 'neutral') 
        || issue.rewriteSuggestions.find(s => s.style === 'conservative')
        || issue.rewriteSuggestions[0];

      if (suggestion && suggestion.text && suggestion.text !== fixedText) {
        appliedFixes.push({
          type: issue.type || 'text_rewrite',
          issue: issue.explanation || '',
          before: fixedText,
          after: suggestion.text,
          applied: true
        });
        fixedText = suggestion.text;
        break; // Only apply first fix per text block
      }
    }
  }

  return {
    fixedText,
    appliedFixes,
    changed: fixedText !== text
  };
}

/**
 * Find replacement term for a disallowed term
 */
function findReplacement(term, preferredTermsMap, disallowedTerms) {
  // First check preferred terms map (if term has a direct mapping)
  if (preferredTermsMap[term]) {
    return preferredTermsMap[term];
  }

  // If no direct mapping, return empty string (will be removed)
  // Note: AI rewrite suggestions from issues will handle semantic replacements
  return '';
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  applyAutofix
};
