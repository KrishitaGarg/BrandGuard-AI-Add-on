/**
 * MCP Context: Adobe Express Integration
 * 
 * Provides Adobe-specific context that influences BrandGuard AI behavior.
 * This context layer ensures the MCP server understands the host application
 * and can adjust rule strictness, scoring thresholds, and fix behavior accordingly.
 */

export interface AdobeContext {
  /** Host application identifier */
  hostApplication: "adobe-express";
  
  /** Type of invocation */
  invocationType: "design-time" | "batch" | "preview";
  
  /** Canvas/artboard metadata */
  canvas: {
    artboardId: string;
    artboardSize: {
      width: number;
      height: number;
    };
    layerCount: number;
  };
  
  /** Brand workspace identifier (mocked for MVP) */
  brandWorkspace: {
    workspaceId: string;
    brandId: string;
  };
  
  /** Context-specific settings */
  settings: {
    /** Rule strictness level (0-1, where 1 is strictest) */
    strictness: number;
    
    /** Scoring threshold adjustments */
    scoring: {
      /** Minimum score threshold for passing */
      minPassingScore: number;
      
      /** Critical violation threshold */
      criticalThreshold: number;
    };
    
    /** Fix behavior preferences */
    fixes: {
      /** Whether to auto-apply fixes when possible */
      autoApply: boolean;
      
      /** Whether to require confirmation for critical fixes */
      requireConfirmation: boolean;
    };
  };
}

/**
 * Creates a default Adobe context for MVP
 */
export function createDefaultAdobeContext(
  brandId: string,
  canvasWidth: number = 1920,
  canvasHeight: number = 1080
): AdobeContext {
  return {
    hostApplication: "adobe-express",
    invocationType: "design-time",
    canvas: {
      artboardId: "default-artboard",
      artboardSize: {
        width: canvasWidth,
        height: canvasHeight,
      },
      layerCount: 0,
    },
    brandWorkspace: {
      workspaceId: "default-workspace",
      brandId,
    },
    settings: {
      strictness: 0.8, // Default to fairly strict
      scoring: {
        minPassingScore: 70,
        criticalThreshold: 3,
      },
      fixes: {
        autoApply: false,
        requireConfirmation: true,
      },
    },
  };
}

/**
 * Adjusts rule strictness based on Adobe context
 */
export function adjustStrictnessForContext(
  baseStrictness: number,
  context: AdobeContext
): number {
  return baseStrictness * context.settings.strictness;
}

/**
 * Determines if a score passes based on context thresholds
 */
export function isScorePassing(
  score: number,
  context: AdobeContext
): boolean {
  return score >= context.settings.scoring.minPassingScore;
}

