/**
 * MCP Schema: Brand Configuration
 * 
 * Defines the structure for brand profiles and validation rules.
 * Used by validate_brand tool to ensure brand configurations are complete
 * and conflict-free.
 */

export interface BrandConfiguration {
  id: string;
  brandName: string;
  visualRules: {
    colors: string[];
    fonts: string[];
    logo: {
      minWidth: number;
      aspectRatio: number;
      padding: number;
    };
  };
  contentRules: {
    tone: string;
    forbiddenPhrases: string[];
    locale: string;
  };
}

export interface BrandValidationResult {
  isValid: boolean;
  errors: BrandValidationError[];
  warnings: BrandValidationWarning[];
}

export interface BrandValidationError {
  field: string;
  message: string;
  severity: "error";
}

export interface BrandValidationWarning {
  field: string;
  message: string;
  severity: "warning";
}

export interface BrandScoringWeights {
  /** Weight for visual violations (0-1) */
  visual: number;
  /** Weight for content violations (0-1) */
  content: number;
  /** Penalty per violation (0-100) */
  violationPenalty: number;
}

