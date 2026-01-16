/**
 * MCP Tool: validate_brand
 * 
 * Validates brand configuration for completeness and conflicts.
 * Returns validation result with errors and warnings.
 */

import { BrandConfiguration, BrandValidationResult } from "../schemas/brand.schema";

export interface ValidateBrandInput {
  brand: BrandConfiguration;
}

export interface ValidateBrandOutput {
  result: BrandValidationResult;
  metadata: {
    executionTimeMs: number;
    toolVersion: string;
  };
}

/**
 * MCP Tool: validate_brand
 * 
 * Validates brand configuration for completeness and rule conflicts.
 */
export function validateBrand(input: ValidateBrandInput): ValidateBrandOutput {
  const startTime = Date.now();

  const errors: BrandValidationResult["errors"] = [];
  const warnings: BrandValidationResult["warnings"] = [];

  // Validate required fields
  if (!input.brand.id || input.brand.id.trim() === "") {
    errors.push({
      field: "id",
      message: "Brand ID is required",
      severity: "error",
    });
  }

  if (!input.brand.brandName || input.brand.brandName.trim() === "") {
    errors.push({
      field: "brandName",
      message: "Brand name is required",
      severity: "error",
    });
  }

  // Validate visual rules
  if (!input.brand.visualRules.colors || input.brand.visualRules.colors.length === 0) {
    errors.push({
      field: "visualRules.colors",
      message: "At least one brand color is required",
      severity: "error",
    });
  } else if (input.brand.visualRules.colors.length < 2) {
    warnings.push({
      field: "visualRules.colors",
      message: "Consider adding more brand colors for design flexibility",
      severity: "warning",
    });
  }

  // Validate color format
  const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  for (const color of input.brand.visualRules.colors) {
    if (!colorRegex.test(color)) {
      errors.push({
        field: "visualRules.colors",
        message: `Invalid color format: ${color}. Expected hex format (e.g., #0033A0)`,
        severity: "error",
      });
    }
  }

  if (!input.brand.visualRules.fonts || input.brand.visualRules.fonts.length === 0) {
    errors.push({
      field: "visualRules.fonts",
      message: "At least one brand font is required",
      severity: "error",
    });
  }

  // Validate logo rules
  if (input.brand.visualRules.logo.minWidth <= 0) {
    errors.push({
      field: "visualRules.logo.minWidth",
      message: "Logo minimum width must be greater than 0",
      severity: "error",
    });
  }

  if (input.brand.visualRules.logo.aspectRatio <= 0) {
    errors.push({
      field: "visualRules.logo.aspectRatio",
      message: "Logo aspect ratio must be greater than 0",
      severity: "error",
    });
  }

  if (input.brand.visualRules.logo.padding < 0) {
    errors.push({
      field: "visualRules.logo.padding",
      message: "Logo padding cannot be negative",
      severity: "error",
    });
  }

  // Validate content rules
  if (!input.brand.contentRules.tone || input.brand.contentRules.tone.trim() === "") {
    warnings.push({
      field: "contentRules.tone",
      message: "Content tone description is recommended for better AI analysis",
      severity: "warning",
    });
  }

  if (!input.brand.contentRules.locale || input.brand.contentRules.locale.trim() === "") {
    warnings.push({
      field: "contentRules.locale",
      message: "Locale specification is recommended for proper content validation",
      severity: "warning",
    });
  }

  // Check for conflicting rules
  if (input.brand.visualRules.colors.length > 0) {
    const uniqueColors = new Set(
      input.brand.visualRules.colors.map((c) => c.toUpperCase())
    );
    if (uniqueColors.size < input.brand.visualRules.colors.length) {
      warnings.push({
        field: "visualRules.colors",
        message: "Duplicate colors detected in brand palette",
        severity: "warning",
      });
    }
  }

  const result: BrandValidationResult = {
    isValid: errors.length === 0,
    errors,
    warnings,
  };

  const executionTime = Date.now() - startTime;

  return {
    result,
    metadata: {
      executionTimeMs: executionTime,
      toolVersion: "1.0.0",
    },
  };
}

