/**
 * BrandGuard AI Backend Server
 * 
 * HTTP server that exposes MCP tools for brand compliance analysis.
 * Provides RESTful endpoints for tool invocation.
 */

import express from "express";
import cors from "cors";
import { invokeMCPTool, listMCPTools, MCPInvokeRequest } from "./mcp/index";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "BrandGuard AI MCP Server" });
});

/**
 * List available MCP tools
 */
app.get("/mcp/tools", (req, res) => {
  try {
    const tools = listMCPTools();
    res.json(tools);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: "TOOL_LIST_ERROR",
        message: error.message,
      },
    });
  }
});

/**
 * Invoke an MCP tool
 * 
 * POST /mcp/invoke
 * 
 * Request body:
 * {
 *   "tool": "analyze_design",
 *   "context": { ... },
 *   "input": { ... }
 * }
 */
app.post("/mcp/invoke", async (req, res) => {
  try {
    const request: MCPInvokeRequest = req.body;

    if (!request.tool) {
      return res.status(400).json({
        error: {
          code: "MISSING_TOOL",
          message: "Tool name is required",
        },
      });
    }

    if (!request.input) {
      return res.status(400).json({
        error: {
          code: "MISSING_INPUT",
          message: "Input is required",
        },
      });
    }

    const response = await invokeMCPTool(request);
    
    if (response.error) {
      return res.status(500).json(response);
    }

    res.json(response);
  } catch (error: any) {
    res.status(500).json({
      result: null,
      metadata: {
        executionTimeMs: 0,
        toolVersion: "1.0.0",
      },
      error: {
        code: "SERVER_ERROR",
        message: error.message || "Unknown error occurred",
      },
    });
  }
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`BrandGuard AI MCP Server running on http://localhost:${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  GET  /health - Health check`);
  console.log(`  GET  /mcp/tools - List available tools`);
  console.log(`  POST /mcp/invoke - Invoke an MCP tool`);
});

