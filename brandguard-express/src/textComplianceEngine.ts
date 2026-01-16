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

export interface RewriteSuggestion {
  style: "conservative" | "neutral" | "friendly";
  text: string;
}

export interface TextComplianceIssue {
  type: "Tone mismatch" | "Clarity" | "Brand voice deviation" | "Risky phrasing";
  severity: "warning" | "critical";
  explanation: string;
  rewriteSuggestions: RewriteSuggestion[];
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

  // Enforce disallowedPhrases, tonePreference, claimsStrictness rules
  let issues: TextComplianceIssue[] = [];
  let score = 100;

  // 1. Disallowed Phrases
  for (const phrase of disallowed) {
    if (tokens.includes(phrase) && !isAlwaysAllowed(phrase) && !isNeverFlagged(phrase)) {
      issues.push({
        type: "Brand voice deviation",
        severity: "critical",
        explanation: `Violates your brand rule: disallowed phrase '${phrase}' (disallowedPhrases)`,
        rewriteSuggestions: []
      });
      score -= 40;
    }
  }

  // 2. Tone Preference
  const greetings = ["hi", "hey", "hello"];
  const casualPhrases = ["cool", "awesome", "what's up", "cheers", "lol", "omg", "btw", "yolo", "dude", "bro"];
  if (brandProfile.tonePreference === "formal") {
    for (const word of greetings.concat(casualPhrases)) {
      if (tokens.includes(word)) {
        issues.push({
          type: "Tone mismatch",
          severity: "warning",
          explanation: `Violates your brand rule: tonePreference 'formal' - phrase '${word}' is too casual`,
          rewriteSuggestions: []
        });
        score -= 20;
      }
    }
  } else if (brandProfile.tonePreference === "neutral") {
    for (const word of casualPhrases) {
      if (tokens.includes(word)) {
        issues.push({
          type: "Tone mismatch",
          severity: "warning",
          explanation: `Violates your brand rule: tonePreference 'neutral' - phrase '${word}' is extremely casual`,
          rewriteSuggestions: []
        });
        score -= 10;
      }
    }
    // greetings are allowed in neutral
  }
  // friendly: do not flag tone

  // 3. Claims Strictness
  const mediumClaims = ["guarantees", "always", "never", "100%", "best ever"];
  const highClaims = mediumClaims.concat(["proven", "unbeatable", "perfect", "flawless", "no exceptions", "all", "every", "must", "will", "cannot fail"]);
  const basePenalty = 8;
  if (brandProfile.claimsStrictness === "medium") {
    for (const word of mediumClaims) {
      if (tokens.includes(word)) {
        issues.push({
          type: "Risky phrasing",
          severity: "critical",
          explanation: `Violates your brand rule: claimsStrictness 'medium' - phrase '${word}' is an absolute claim`,
          rewriteSuggestions: []
        });
        score -= basePenalty;
      }
    }
  } else if (brandProfile.claimsStrictness === "high") {
    for (const word of highClaims) {
      if (tokens.includes(word)) {
        issues.push({
          type: "Risky phrasing",
          severity: "critical",
          explanation: `Violates your brand rule: claimsStrictness 'high' - phrase '${word}' is a strong/superlative claim`,
          rewriteSuggestions: []
        });
        score -= Math.round(basePenalty * 1.5);
      }
    }
  }
  // low: do not flag claims

  // 4. Preferred Terms (suggestions only, no violations, no score impact)
  if (issues.length === 0 && Array.isArray(brandProfile.preferredTerms) && brandProfile.preferredTerms.length > 0) {
    for (const term of brandProfile.preferredTerms) {
      if (!tokens.includes(term.toLowerCase())) {
        issues.push({
          type: "Brand voice deviation",
          severity: "warning",
          explanation: `Suggestion: consider using preferred term '${term}'`,
          rewriteSuggestions: []
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

  // If any issues, return them directly
  if (issues.length > 0) {
    return {
      score,
      issues
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


