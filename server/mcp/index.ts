/**
 * MCP Server: BrandGuard AI
 * 
 * Model Context Protocol server that exposes BrandGuard AI capabilities
 * as structured, tool-based services for Adobe Express integration.
 * 
 * This server is stateless and deterministic, following MCP principles.
 */

import { analyzeDesign, AnalyzeDesignInput, AnalyzeDesignOutput } from "./tools/analyzeDesign";
import { scoreCompliance, ScoreComplianceInput, ScoreComplianceOutput } from "./tools/scoreCompliance";
import { applyFixes, ApplyFixesInput, ApplyFixesOutput } from "./tools/applyFixes";
import { validateBrand, ValidateBrandInput, ValidateBrandOutput } from "./tools/validateBrand";

/**
 * Available MCP tools
 */
export const MCP_TOOLS = {
  analyze_design: "analyze_design",
  score_compliance: "score_compliance",
  apply_fixes: "apply_fixes",
  validate_brand: "validate_brand",
} as const;

export type MCPToolName = typeof MCP_TOOLS[keyof typeof MCP_TOOLS];

/**
 * MCP Tool Invocation Request
 */
export interface MCPInvokeRequest {
  tool: MCPToolName;
  context?: Record<string, any>;
  input: Record<string, any>;
}

/**
 * MCP Tool Invocation Response
 */
export interface MCPInvokeResponse {
  result: any;
  metadata: {
    executionTimeMs: number;
    toolVersion: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Invokes an MCP tool by name
 * 
 * This is the core dispatch function that routes tool calls to their implementations.
 */
export async function invokeMCPTool(
  request: MCPInvokeRequest
): Promise<MCPInvokeResponse> {
  try {
    switch (request.tool) {
      case MCP_TOOLS.analyze_design: {
        const result = await analyzeDesign(request.input as AnalyzeDesignInput);
        return {
          result: result.result,
          metadata: result.metadata,
        };
      }

      case MCP_TOOLS.score_compliance: {
        const result = scoreCompliance(request.input as ScoreComplianceInput);
        return {
          result: result.result,
          metadata: result.metadata,
        };
      }

      case MCP_TOOLS.apply_fixes: {
        const result = applyFixes(request.input as ApplyFixesInput);
        return {
          result: result.result,
          metadata: result.metadata,
        };
      }

      case MCP_TOOLS.validate_brand: {
        const result = validateBrand(request.input as ValidateBrandInput);
        return {
          result: result.result,
          metadata: result.metadata,
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.tool}`);
    }
  } catch (error: any) {
    return {
      result: null,
      metadata: {
        executionTimeMs: 0,
        toolVersion: "1.0.0",
      },
      error: {
        code: "TOOL_EXECUTION_ERROR",
        message: error.message || "Unknown error occurred",
      },
    };
  }
}

/**
 * Lists all available MCP tools with their schemas
 */
export function listMCPTools() {
  return {
    tools: [
      {
        name: MCP_TOOLS.analyze_design,
        description: "Analyzes a design for brand compliance violations",
        inputSchema: {
          type: "object",
          properties: {
            design: {
              type: "object",
              properties: {
                designId: { type: "string" },
                canvas: {
                  type: "object",
                  properties: {
                    width: { type: "number" },
                    height: { type: "number" },
                  },
                },
                layers: { type: "array" },
              },
            },
            brandRules: {
              type: "object",
              properties: {
                brandId: { type: "string" },
                visual: { type: "object" },
                content: { type: "object" },
              },
            },
          },
        },
      },
      {
        name: MCP_TOOLS.score_compliance,
        description: "Calculates compliance score from violations",
        inputSchema: {
          type: "object",
          properties: {
            violations: { type: "array" },
            totalElements: { type: "number" },
            weights: { type: "object" },
          },
        },
      },
      {
        name: MCP_TOOLS.apply_fixes,
        description: "Generates fix instructions for violations",
        inputSchema: {
          type: "object",
          properties: {
            violations: { type: "array" },
            design: { type: "object" },
            weights: { type: "object" },
          },
        },
      },
      {
        name: MCP_TOOLS.validate_brand,
        description: "Validates brand configuration for completeness",
        inputSchema: {
          type: "object",
          properties: {
            brand: { type: "object" },
          },
        },
      },
    ],
  };
}

