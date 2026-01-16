// brandProfile.ts
// Phase 3: Structured Brand Profile Model for Adobe Express Add-on
// This module defines the brand profile structure, validation, and helpers.

export type TonePreference = "formal" | "neutral" | "friendly";
export type ClaimsStrictness = "low" | "medium" | "high";

export interface BrandProfile {
  tonePreference: TonePreference;
  claimsStrictness: ClaimsStrictness;
  disallowedPhrases: string[];
  preferredTerms: string[];
  brandDescription: string; // For AI context only
  memory?: BrandMemoryEntry[];
}

export interface BrandMemoryEntry {
  phrase: string;
  action: "alwaysAllow" | "neverFlag";
}

// Default profile (can be edited by user)
export const defaultBrandProfile: BrandProfile = {
  tonePreference: "neutral",
  claimsStrictness: "medium",
  disallowedPhrases: [],
  preferredTerms: [],
  brandDescription: "",
  memory: []
};

// Validation helper
export function validateBrandProfile(profile: Partial<BrandProfile>): BrandProfile {
  return {
    tonePreference: ["formal", "neutral", "friendly"].includes(profile.tonePreference!) ? profile.tonePreference! : "neutral",
    claimsStrictness: ["low", "medium", "high"].includes(profile.claimsStrictness!) ? profile.claimsStrictness! : "medium",
    disallowedPhrases: Array.isArray(profile.disallowedPhrases) ? profile.disallowedPhrases : [],
    preferredTerms: Array.isArray(profile.preferredTerms) ? profile.preferredTerms : [],
    brandDescription: typeof profile.brandDescription === "string" ? profile.brandDescription : "",
    memory: Array.isArray(profile.memory) ? profile.memory : []
  };
}
