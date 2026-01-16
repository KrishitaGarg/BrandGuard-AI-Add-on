# BrandGuard AI MCP Server

## What is MCP?

**Model Context Protocol (MCP)** is a standardized protocol for exposing AI capabilities as structured, tool-based services. Unlike chat-based AI interfaces, MCP focuses on:

- **Tools**: Discrete, callable functions with structured inputs/outputs
- **Context**: Environment-aware information that influences behavior
- **Determinism**: Predictable, explainable results
- **Statelessness**: Each tool call is independent

## Why MCP for BrandGuard AI?

BrandGuard AI is designed as an **intelligent brand governance engine**, not a chatbot. MCP allows Adobe Express (or any MCP client) to:

1. **Invoke BrandGuard AI contextually** at design-time
2. **Get structured, explainable results** for compliance analysis
3. **Integrate seamlessly** without chat UI overhead
4. **Scale enterprise-wide** with consistent, deterministic behavior

## Architecture

```
Adobe Express (MCP Client)
    ↓ HTTP/JSON
MCP Server (server/mcp/)
    ├─ Tools (analyze_design, score_compliance, apply_fixes, validate_brand)
    ├─ Schemas (design, brand, compliance)
    └─ Context (Adobe-specific settings)
        ↓
Compliance Engine (server/engine/)
    └─ Pure, stateless functions
```

## Available Tools

### 1. `analyze_design`

Analyzes a design for brand compliance violations.

**Input:**
```json
{
  "design": {
    "designId": "design-123",
    "canvas": { "width": 1920, "height": 1080 },
    "layers": [...]
  },
  "brandRules": {
    "brandId": "acme-corp",
    "visual": { "colors": [...], "fonts": [...], "logo": {...} },
    "content": { "tone": "...", "forbiddenPhrases": [...], "locale": "en-US" }
  }
}
```

**Output:**
```json
{
  "result": {
    "violations": [...],
    "summary": {
      "totalViolations": 3,
      "byDomain": { "visual": 2, "content": 1 },
      "bySeverity": { "critical": 1, "warning": 2 }
    },
    "metadata": {
      "analyzedElements": 5,
      "analysisTimestamp": "2024-01-15T10:30:00Z"
    }
  },
  "metadata": {
    "executionTimeMs": 45,
    "toolVersion": "1.0.0"
  }
}
```

### 2. `score_compliance`

Calculates compliance score from violations.

**Input:**
```json
{
  "violations": [...],
  "totalElements": 5,
  "weights": { "visual": 0.65, "content": 0.35 }
}
```

**Output:**
```json
{
  "result": {
    "score": { "total": 75, "visual": 80, "content": 65 },
    "breakdown": {
      "visual": { "score": 80, "violations": 2, "deduction": 30 },
      "content": { "score": 65, "violations": 1, "deduction": 15 },
      "total": { "score": 75, "weights": { "visual": 0.65, "content": 0.35 } }
    },
    "interpretation": {
      "level": "good",
      "message": "Design is mostly compliant with minor issues to address."
    }
  }
}
```

### 3. `apply_fixes`

Generates fix instructions for violations.

**Input:**
```json
{
  "violations": [...],
  "design": { "layers": [...] },
  "weights": { "visual": 0.65, "content": 0.35 }
}
```

**Output:**
```json
{
  "result": {
    "fixes": [
      {
        "elementId": "layer-1",
        "fixType": "color",
        "currentValue": "#FF0000",
        "suggestedValue": "#0033A0",
        "updates": { "fill": "#0033A0" }
      }
    ],
    "projectedScore": { "total": 90, "visual": 95, "content": 80 },
    "summary": {
      "totalFixes": 3,
      "autoFixable": 3,
      "manualReview": 0
    }
  }
}
```

### 4. `validate_brand`

Validates brand configuration for completeness and conflicts.

**Input:**
```json
{
  "brand": {
    "id": "acme-corp",
    "brandName": "Acme Corp",
    "visualRules": { "colors": [...], "fonts": [...], "logo": {...} },
    "contentRules": { "tone": "...", "forbiddenPhrases": [...], "locale": "en-US" }
  }
}
```

**Output:**
```json
{
  "result": {
    "isValid": true,
    "errors": [],
    "warnings": [
      {
        "field": "visualRules.colors",
        "message": "Consider adding more brand colors for design flexibility",
        "severity": "warning"
      }
    ]
  }
}
```

## HTTP Transport

The MCP server exposes tools via HTTP endpoints:

### Endpoints

- `GET /health` - Health check
- `GET /mcp/tools` - List available tools
- `POST /mcp/invoke` - Invoke an MCP tool

### Example: Invoking a Tool

```bash
curl -X POST http://localhost:3001/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "analyze_design",
    "input": {
      "design": { ... },
      "brandRules": { ... }
    }
  }'
```

## Adobe Express Integration

When Adobe Express invokes BrandGuard AI:

1. **Design-time context** is provided (artboard size, layers, brand workspace)
2. **MCP tools are called** with structured inputs
3. **Results are returned** as JSON (violations, scores, fixes)
4. **UI updates** based on tool outputs (no chat interface)

### Example Flow

```typescript
// In Adobe Express add-on
const layers = await editor.getLayers();
const brandProfile = await getBrandProfile();

// Call MCP tool
const response = await fetch('http://localhost:3001/mcp/invoke', {
  method: 'POST',
  body: JSON.stringify({
    tool: 'analyze_design',
    input: {
      design: { layers, canvas: { width: 1920, height: 1080 } },
      brandRules: brandProfile
    }
  })
});

const { violations, score } = response.result;
// Display violations in UI, show compliance score
```

## Context Layer

The Adobe context layer (`server/mcp/context/adobeContext.ts`) provides:

- **Host application awareness**: Knows it's running in Adobe Express
- **Invocation type**: design-time, batch, or preview
- **Canvas metadata**: Artboard size, layer count
- **Brand workspace**: Brand ID and workspace identifier
- **Settings**: Rule strictness, scoring thresholds, fix behavior

This context influences:
- Rule strictness (stricter in production, lenient in preview)
- Scoring thresholds (different passing scores per context)
- Fix behavior (auto-apply vs. require confirmation)

## Development

### Start the MCP Server

```bash
npm run server
```

Server runs on `http://localhost:3001` by default.

### Environment Variables

- `PORT` - Server port (default: 3001)
- `GEMINI_API_KEY` - Google Gemini API key for content analysis

### Testing Tools

```bash
# List available tools
curl http://localhost:3001/mcp/tools

# Analyze a design
curl -X POST http://localhost:3001/mcp/invoke \
  -H "Content-Type: application/json" \
  -d @examples/analyze_design.json
```

## Design Principles

1. **Stateless**: Each tool call is independent
2. **Deterministic**: Same input = same output
3. **Explainable**: All results include reasoning
4. **Structured**: JSON schemas for all inputs/outputs
5. **Tool-based**: No chat UI, pure function calls

## Future Enhancements

- WebSocket transport for real-time updates
- Batch processing for multiple designs
- Custom rule engines per brand
- Integration with Adobe Creative SDK
- MCP protocol compliance (SSE/stdio transport)

