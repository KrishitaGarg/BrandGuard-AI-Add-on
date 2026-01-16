/**
 * MCP Schema: Design Metadata
 * 
 * Represents design structure and metadata that can be analyzed
 * by BrandGuard AI tools. This schema ensures structured input/output
 * for design analysis operations.
 */

import { Layer } from "../../../types";

export interface DesignMetadata {
  /** Unique identifier for the design/artboard */
  designId: string;
  
  /** Canvas/artboard dimensions */
  canvas: {
    width: number;
    height: number;
  };
  
  /** All layers in the design */
  layers: Layer[];
  
  /** Optional metadata about the design context */
  metadata?: {
    title?: string;
    createdAt?: string;
    modifiedAt?: string;
  };
}

export interface DesignAnalysisInput {
  design: DesignMetadata;
  brandRules: BrandRulesInput;
}

export interface BrandRulesInput {
  /** Brand profile identifier */
  brandId: string;
  
  /** Visual brand rules */
  visual: {
    colors: string[];
    fonts: string[];
    logo: {
      minWidth: number;
      aspectRatio: number;
      padding: number;
    };
  };
  
  /** Content brand rules */
  content: {
    tone: string;
    forbiddenPhrases: string[];
    locale: string;
  };
}

