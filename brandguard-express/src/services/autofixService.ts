/**
 * Autofix Service (Frontend-Only)
 * 
 * Applies deterministic fixes to text content based on brand guidelines.
 * Runs entirely in the frontend - no backend API calls needed.
 * Reuses the same logic pattern as backend autofix service.
 */

export interface AutofixRequest {
  text: string;
  issues: any[];
  brandGuidelines: {
    preferredTerms: Record<string, string>;
    disallowedTerms: string[];
    toneRules?: string[];
  };
}

export interface AutofixResponse {
  success: boolean;
  fixedText: string;
  appliedFixes: Array<{
    type: string;
    issue: string;
    before: string;
    after: string;
    applied: boolean;
  }>;
  changed: boolean;
  error?: string;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find a replacement for a disallowed term from preferred terms map
 */
function findReplacement(
  term: string,
  preferredTermsMap: Record<string, string>
): string {
  // Check if the disallowed term has a preferred replacement
  if (preferredTermsMap[term]) {
    return preferredTermsMap[term];
  }
  
  // Case-insensitive lookup
  const lowerTerm = term.toLowerCase();
  for (const [key, value] of Object.entries(preferredTermsMap)) {
    if (key.toLowerCase() === lowerTerm) {
      return value;
    }
  }
  
  // No replacement found - return empty string to remove the term
  return '';
}

/**
 * Apply autofix to text content (Frontend-only implementation)
 * 
 * Uses deterministic rules - no backend API call needed.
 * Same logic as backend autofixService.js but runs in browser.
 */
export async function applyAutofix(request: AutofixRequest): Promise<AutofixResponse> {
  try {
    const { text, issues, brandGuidelines } = request;

    if (!text || typeof text !== 'string') {
      return {
        success: false,
        fixedText: text || '',
        appliedFixes: [],
        changed: false,
        error: 'Invalid text input',
      };
    }

    let fixedText = text;
    const appliedFixes: Array<{
      type: string;
      issue: string;
      before: string;
      after: string;
      applied: boolean;
    }> = [];

    // Convert preferredTerms to map
    const preferredTermsMap: Record<string, string> = {};
    if (brandGuidelines?.preferredTerms) {
      Object.assign(preferredTermsMap, brandGuidelines.preferredTerms);
    }

    // Extract preferred terms from issues if not provided in map
    if (issues && Array.isArray(issues)) {
      for (const issue of issues) {
        if (issue.rewriteSuggestions && Array.isArray(issue.rewriteSuggestions)) {
          for (const suggestion of issue.rewriteSuggestions) {
            if (suggestion.type === 'preferred-term' && suggestion.original && suggestion.replacement) {
              preferredTermsMap[suggestion.original] = suggestion.replacement;
            }
          }
        }
        if (issue.suggestions && Array.isArray(issue.suggestions)) {
          for (const suggestion of issue.suggestions) {
            if (suggestion.type === 'preferred-term' && suggestion.original && suggestion.replacement) {
              preferredTermsMap[suggestion.original] = suggestion.replacement;
            }
          }
        }
      }
    }

    const disallowedTerms = Array.isArray(brandGuidelines?.disallowedTerms)
      ? brandGuidelines.disallowedTerms
      : [];

    // 1. Remove/replace disallowed terms FIRST (highest priority)
    for (const term of disallowedTerms) {
      if (!term || typeof term !== 'string') continue;

      const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'gi');
      if (regex.test(fixedText)) {
        const replacement = findReplacement(term, preferredTermsMap);
        const newText = fixedText.replace(regex, replacement);

        if (newText !== fixedText) {
          appliedFixes.push({
            type: 'disallowed_term_removal',
            issue: `Removed/replaced disallowed term: "${term}"`,
            before: fixedText,
            after: newText,
            applied: true,
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
              applied: true,
            });
            fixedText = newText;
          }
        }
      }
    }

    // 3. Apply tone fixes from issues (use rewriteSuggestions)
    if (issues && Array.isArray(issues)) {
      for (const issue of issues) {
        if (issue.rewriteSuggestions && Array.isArray(issue.rewriteSuggestions)) {
          // Use the first rewrite suggestion as the fix
          const suggestion = issue.rewriteSuggestions.find((s: any) => s.text);
          if (suggestion && suggestion.text && suggestion.text !== fixedText) {
            appliedFixes.push({
              type: 'tone_rewrite',
              issue: issue.explanation || issue.type || 'Tone violation',
              before: fixedText,
              after: suggestion.text,
              applied: true,
            });
            fixedText = suggestion.text;
            break; // Apply first suggestion only
          }
        }
      }
    }

    const changed = appliedFixes.length > 0;

    return {
      success: true,
      fixedText,
      appliedFixes,
      changed,
    };
  } catch (error) {
    console.error('Error applying autofix:', error);
    return {
      success: false,
      fixedText: request.text,
      appliedFixes: [],
      changed: false,
      error: error instanceof Error ? error.message : 'Autofix failed',
    };
  }
}
