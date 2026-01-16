import { BrandProfile, BrandMemoryEntry } from "./brandProfile";
// textComplianceEngine.ts
// Phase 2: Text & Brand-Voice Compliance Engine for Adobe Express Add-on
// This module is a strict additive extension. It does NOT replace or refactor existing visual compliance logic.
//
// All AI calls are:
// - Explicitly user-triggered (never background)
// - Isolated per selected text element
// - Never store or persist content
// - Never auto-apply rewrites
// - Only return structured, explainable JSON (see schema below)
//
// Why AI is used: To evaluate natural-language brand voice and tone, which cannot be fully captured by deterministic rules.
// Why content is not stored: To comply with Adobe and user privacy requirements.
// Why execution is user-controlled: To ensure no background or automatic analysis occurs.


// Standard rewrite suggestion (legacy/AI)
export interface RewriteSuggestion {
  style: "conservative" | "neutral" | "friendly";
  text: string;
}

// Preferred term suggestion (for brand-specific suggestions)
export interface PreferredTermSuggestion {
  type: "preferred-term";
  original: string;
  replacement: string;
  reason: string;
}

// Allow both types in the array
type AnySuggestion = RewriteSuggestion | PreferredTermSuggestion;

export interface TextComplianceIssue {
  type: "Tone mismatch" | "Clarity" | "Brand voice deviation" | "Risky phrasing";
  severity: "warning" | "critical";
  explanation: string;
  rewriteSuggestions?: AnySuggestion[];
  suggestions?: AnySuggestion[];
}

export interface TextComplianceResult {
  score: number;
  issues: TextComplianceIssue[];
}

/**
 * Analyze selected text for brand-voice compliance using an AI model.
 * @param text - The selected text content (never full document).
 * @param brandGuidelines - Brand guidelines in natural language.
 * @param aiApiCall - Function to call the AI model (must return a Promise resolving to the required JSON schema).
 * @returns Structured compliance result (see schema).
 */
// Phase 3: Rule-aware, brand-profile-driven text compliance
export async function analyzeTextCompliance(
  text: string,
  brandProfile: BrandProfile,
  aiApiCall: (prompt: any) => Promise<TextComplianceResult>
): Promise<TextComplianceResult> {
  // Defensive validation
  if (!text || typeof text !== 'string') {
    throw new Error("Text is missing or not a string");
  }
  if (!brandProfile || typeof brandProfile !== 'object') {
    throw new Error("Brand profile missing or not an object");
  }
  if (!Array.isArray(brandProfile.disallowedPhrases)) {
    throw new Error("brandProfile.disallowedPhrases must be an array");
  }
  if (!brandProfile.disallowedPhrases.every(p => typeof p === 'string' && p.trim().length > 0)) {
    throw new Error("brandProfile.disallowedPhrases must be non-empty strings");
  }

  // Normalize text and phrases to lowercase for case-insensitive matching
  const normalizedText = text.toLowerCase();
  const disallowed = brandProfile.disallowedPhrases.map(p => p.toLowerCase());

  // Tokenize text (split on whitespace and punctuation)
  const tokens = normalizedText.split(/\W+/).filter(Boolean);

  // Brand memory: skip issues for phrases marked as alwaysAllow, never flag issues for neverFlag
  const memory = brandProfile.memory || [];
  function isAlwaysAllowed(phrase: string) {
    return memory.some((entry: BrandMemoryEntry) => entry.phrase === phrase && entry.action === "alwaysAllow");
  }
  function isNeverFlagged(phrase: string) {
    return memory.some((entry: BrandMemoryEntry) => entry.phrase === phrase && entry.action === "neverFlag");
  }


  // --- Penalty multipliers ---
  let brandDescMultiplier = 1.0;
  if (typeof brandProfile.brandDescription === 'string') {
    const desc = brandProfile.brandDescription.toLowerCase();
    if (desc.includes('regulated') || desc.includes('legal') || desc.includes('enterprise')) {
      brandDescMultiplier = 1.1;
    }
  }


  // --- Issue detection and scoring with deduplication ---
  let issues: (TextComplianceIssue & { penalty: number, rule: string, field: string, value: string, trigger: string, key: string })[] = [];
  let score = 100;
  const seenKeys = new Set<string>();
  const elementId = (brandProfile as any).elementId || "element";

  // Helper to add unique issues
  function addIssue(ruleType: string, trigger: string, issue: Omit<TextComplianceIssue, 'penalty'|'rule'|'field'|'value'|'trigger'|'key'> & { penalty: number, field: string, value: string }) {
    const key = `${elementId}::${ruleType}::${trigger}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    issues.push({ ...issue, rule: ruleType, trigger, key, penalty: issue.penalty, field: issue.field, value: issue.value });
    score += issue.penalty;
  }

  // 1. Disallowed Phrases (hard violation, highest penalty)
  for (const phrase of disallowed) {
    if (tokens.includes(phrase)) {
      if (isAlwaysAllowed(phrase) || isNeverFlagged(phrase)) continue;
      const penalty = Math.round(-12 * brandDescMultiplier);
      addIssue('disallowedPhrases', phrase, {
        type: "Brand voice deviation",
        severity: "critical",
        explanation: `Violates your brand rule: disallowed phrase '${phrase}' (disallowedPhrases) [penalty: ${penalty}]`,
        rewriteSuggestions: [],
        penalty,
        field: 'disallowedPhrases',
        value: phrase
      });
    }
  }

  // 2. Tone Preference
  const greetings = ["hi", "hey", "hello"];
  const casualPhrases = ["cool", "awesome", "what's up", "cheers", "lol", "omg", "btw", "yolo", "dude", "bro"];
  let tonePenaltyBase = -6;
  if (brandProfile.tonePreference === "formal") {
    tonePenaltyBase = Math.round(tonePenaltyBase * 1.25);
    for (const word of greetings.concat(casualPhrases)) {
      if (tokens.includes(word)) {
        if (isAlwaysAllowed(word) || isNeverFlagged(word)) continue;
        const penalty = Math.round(tonePenaltyBase * brandDescMultiplier);
        addIssue('tonePreference', word, {
          type: "Tone mismatch",
          severity: "warning",
          explanation: `Tone mismatch with your brand’s 'formal' preference: phrase '${word}' [penalty: ${penalty}]`,
          rewriteSuggestions: [],
          penalty,
          field: 'tonePreference',
          value: 'formal'
        });
      }
    }
  } else if (brandProfile.tonePreference === "neutral") {
    for (const word of casualPhrases) {
      if (tokens.includes(word)) {
        if (isAlwaysAllowed(word) || isNeverFlagged(word)) continue;
        const penalty = Math.round(tonePenaltyBase * brandDescMultiplier);
        addIssue('tonePreference', word, {
          type: "Tone mismatch",
          severity: "warning",
          explanation: `Tone mismatch with your brand’s 'neutral' preference: phrase '${word}' [penalty: ${penalty}]`,
          rewriteSuggestions: [],
          penalty,
          field: 'tonePreference',
          value: 'neutral'
        });
      }
    }
    // greetings are allowed in neutral
  }
  // friendly: do not flag tone

  // 3. Claims Strictness
  const mediumClaims = ["guarantees", "always", "never", "100%", "best ever"];
  const highClaims = mediumClaims.concat(["proven", "unbeatable", "perfect", "flawless", "no exceptions", "all", "every", "must", "will", "cannot fail"]);
  const basePenalty = -8;
  if (brandProfile.claimsStrictness === "medium") {
    for (const word of mediumClaims) {
      if (tokens.includes(word)) {
        if (isAlwaysAllowed(word) || isNeverFlagged(word)) continue;
        const penalty = Math.round(basePenalty * 1.0 * brandDescMultiplier);
        addIssue('claimsStrictness', word, {
          type: "Risky phrasing",
          severity: "critical",
          explanation: `Violates claims strictness set to 'medium': phrase '${word}' [penalty: ${penalty}]`,
          rewriteSuggestions: [],
          penalty,
          field: 'claimsStrictness',
          value: 'medium'
        });
      }
    }
  } else if (brandProfile.claimsStrictness === "high") {
    for (const word of highClaims) {
      if (tokens.includes(word)) {
        if (isAlwaysAllowed(word) || isNeverFlagged(word)) continue;
        const penalty = Math.round(basePenalty * 1.5 * brandDescMultiplier);
        addIssue('claimsStrictness', word, {
          type: "Risky phrasing",
          severity: "critical",
          explanation: `Violates claims strictness set to 'high': phrase '${word}' [penalty: ${penalty}]`,
          rewriteSuggestions: [],
          penalty,
          field: 'claimsStrictness',
          value: 'high'
        });
      }
    }
  }
  // low: do not flag claims

  // 4. Preferred Terms (suggestions only, no violations, no score impact)
  if (issues.length === 0 && Array.isArray(brandProfile.preferredTerms) && brandProfile.preferredTerms.length > 0) {
    for (const term of brandProfile.preferredTerms) {
      if (!tokens.includes(term.toLowerCase())) {
        addIssue('preferredTerms', term, {
          type: "Brand voice deviation",
          severity: "warning",
          explanation: `Consider using preferred term '${term}' to better match your brand voice [penalty: 0]`,
          rewriteSuggestions: [],
          penalty: 0,
          field: 'preferredTerms',
          value: term
        });
      }
    }
  }

  // Clamp score to [0, 99] if any issues, else 100
  if (issues.length > 0) {
    score = Math.max(0, Math.min(99, score));
  } else {
    score = 100;
  }

  // --- Suggestion Layer Enhancement ---
  // Only attach suggestions to existing issues, never create new issues for preferred terms
  if (issues.length > 0 && Array.isArray(brandProfile.preferredTerms) && brandProfile.preferredTerms.length > 0) {
    // Classify preferred terms as lexical or semantic
    function classifyPreferredTerm(term: string): "lexical" | "semantic" {
      // Lexical: single word, not plural, not abstract
      // Semantic: plural, phrase, or abstract
      const trimmed = term.trim();
      if (!/^\w+$/.test(trimmed)) return "semantic"; // phrase or contains non-word chars
      if (trimmed.endsWith("s") && trimmed.length > 3) return "semantic"; // likely plural
      // List of common abstract/semantic terms (expand as needed)
      const abstract = ["greetings", "professional", "formal", "friendly", "casual", "polite", "respectful", "modern", "classic", "inclusive", "welcoming", "positive", "negative", "brand", "voice", "language", "style"];
      if (abstract.includes(trimmed.toLowerCase())) return "semantic";
      return "lexical";
    }

    // Deduplicate suggestions per (element, rule, phrase)
    const suggestionKeys = new Set<string>();
    for (const issue of issues) {
      if (issue.rule === 'preferredTerms' || issue.penalty === 0) continue;
      if (isAlwaysAllowed(issue.trigger) || isNeverFlagged(issue.trigger)) continue;

      let suggestionAdded = false;
      for (const preferred of brandProfile.preferredTerms) {
        const preferredLc = preferred.toLowerCase();
        const suggestionKey = `${elementId}::${issue.rule}::${issue.trigger}`;
        if (suggestionKeys.has(suggestionKey)) continue;

        const classification = classifyPreferredTerm(preferred);
        // Only suggest if not already present in text
        if (classification === "lexical") {
          // Only suggest if both are single words and not the same
          if (issue.trigger !== preferredLc && /^\w+$/.test(issue.trigger) && !tokens.includes(preferredLc)) {
            if (!issue.rewriteSuggestions) issue.rewriteSuggestions = [];
            issue.rewriteSuggestions.push({
              type: "preferred-term",
              original: issue.trigger,
              replacement: preferred,
              reason: `Replace '${issue.trigger}' with '${preferred}'`
            });
            suggestionKeys.add(suggestionKey);
            suggestionAdded = true;
            break; // Only one suggestion per (element, rule, phrase)
          }
        } else if (classification === "semantic") {
          // Suggest semantic guidance if not already present in text
          if (!tokens.includes(preferredLc)) {
            if (!issue.rewriteSuggestions) issue.rewriteSuggestions = [];
            issue.rewriteSuggestions.push({
              type: "preferred-term",
              original: issue.trigger,
              replacement: preferred,
              reason: `Use a ${preferred}-style alternative instead of '${issue.trigger}'`
            });
            suggestionKeys.add(suggestionKey);
            suggestionAdded = true;
            break; // Only one suggestion per (element, rule, phrase)
          }
        }
      }
    }
  }

  // Remove penalty, rule, field, value, trigger, key from output issues (keep explanation, type, severity, suggestions)
  const outputIssues: TextComplianceIssue[] = issues.map(({ type, severity, explanation, rewriteSuggestions }) => {
    // Only include suggestions if present and non-empty
    const out: any = { type, severity, explanation };
    if (rewriteSuggestions && rewriteSuggestions.length > 0) {
      // If any suggestion is a preferred-term, use suggestions field; else use rewriteSuggestions
      if (rewriteSuggestions.some(s => (s as any).type === "preferred-term")) {
        out.suggestions = rewriteSuggestions;
      } else {
        out.rewriteSuggestions = rewriteSuggestions;
      }
    }
    return out;
  });

  // If any issues, return them directly
  if (outputIssues.length > 0) {
    return {
      score,
      issues: outputIssues
    };
  }

  // If no issues from rules, call AI for further compliance
  // ...existing code...
    // Build explicit rules for AI prompt
    const rules = {
      tone: brandProfile.tonePreference,
      claimsStrictness: brandProfile.claimsStrictness,
      disallowedPhrases: brandProfile.disallowedPhrases,
      preferredTerms: brandProfile.preferredTerms
    };

    const prompt = {
      instruction: "Evaluate the following text for brand-voice compliance. Return ONLY the specified JSON schema. Never include free-form prose. Flag only when a rule is violated, and tie every issue to a specific brand rule.",
      text,
      brandDescription: brandProfile.brandDescription,
      rules,
      schema: {
        score: "0-100 (overall compliance)",
        issues: [
          {
            type: "Tone mismatch | Clarity | Brand voice deviation | Risky phrasing",
            severity: "warning | critical",
            explanation: "Clear, human-readable reason tied to a specific brand rule",
            rewriteSuggestions: [
              {
                style: "conservative | neutral | friendly",
                text: "Rewritten version preserving meaning"
              }
            ]
          }
        ]
      }
    };

    let aiResult: any;
    try {
      aiResult = await aiApiCall(prompt);
    } catch (e) {
      return {
        score: 100,
        issues: []
      };
    }
    if (
      typeof aiResult !== 'object' ||
      typeof aiResult.score !== 'number' ||
      !Array.isArray(aiResult.issues)
    ) {
      return {
        score: 100,
        issues: []
      };
    }
    aiResult.score = Math.max(0, Math.min(100, aiResult.score));
    const allowedTypes = [
      'Tone mismatch',
      'Clarity',
      'Brand voice deviation',
      'Risky phrasing'
    ];
    const allowedSeverities = ['warning', 'critical'];
    aiResult.issues = aiResult.issues.filter((issue: any) =>
      allowedTypes.includes(issue.type) &&
      allowedSeverities.includes(issue.severity) &&
      typeof issue.explanation === 'string' &&
      Array.isArray(issue.rewriteSuggestions)
      // Brand memory: filter out issues for alwaysAllow, neverFlag
      && !isAlwaysAllowed(issue.explanation) && !isNeverFlagged(issue.explanation)
    );
    aiResult.issues.forEach((issue: any) => {
      issue.rewriteSuggestions = (issue.rewriteSuggestions || []).filter((suggestion: any) =>
        ['conservative', 'neutral', 'friendly'].includes(suggestion.style) &&
        typeof suggestion.text === 'string'
      );
    });
    return aiResult;
  }


