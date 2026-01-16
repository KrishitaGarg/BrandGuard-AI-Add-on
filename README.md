<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# BrandGuard AI - Adobe Express Add-On

Intelligent brand compliance engine for Adobe Express with Model Context Protocol (MCP) integration.

## Overview

BrandGuard AI is an Adobe Express add-on that provides real-time brand compliance analysis. The backend is implemented as an MCP-compatible server, exposing brand governance capabilities as structured, tool-based services.

### Key Features

- **Real-time Compliance Analysis**: Analyzes designs for brand rule violations
- **MCP Server**: Exposes capabilities as structured tools (not a chatbot)
- **Deterministic Results**: Predictable, explainable compliance scoring
- **Auto-fix Capabilities**: Generates fix instructions for violations
- **Adobe Context-Aware**: Understands Adobe Express design context

## Architecture

```
Frontend (React + Vite)
    ↓ HTTP
MCP Server (Node.js + Express)
    ├─ Tools (analyze_design, score_compliance, apply_fixes, validate_brand)
    ├─ Schemas (design, brand, compliance)
    └─ Context (Adobe-specific settings)
        ↓
Compliance Engine (Pure Functions)
```

## Run Locally

**Prerequisites:** Node.js 18+

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env.local` file in the root directory:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

For the MCP server, you can also set:

```bash
PORT=3001  # MCP server port (default: 3001)
VITE_MCP_SERVER_URL=http://localhost:3001  # Frontend MCP server URL
```

### 3. Start the MCP Server

In one terminal:

```bash
npm run server
```

The MCP server will run on `http://localhost:3001`

### 4. Start the Frontend

In another terminal:

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## MCP Server

The MCP server exposes BrandGuard AI capabilities as structured tools. See [server/mcp/README.md](server/mcp/README.md) for detailed documentation.

### Available Tools

- `analyze_design` - Analyzes design for brand compliance violations
- `score_compliance` - Calculates compliance score from violations
- `apply_fixes` - Generates fix instructions for violations
- `validate_brand` - Validates brand configuration

### Example: Invoke MCP Tool

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

## Project Structure

```
.
├── server/
│   ├── mcp/              # MCP server implementation
│   │   ├── tools/        # MCP tools
│   │   ├── schemas/      # Input/output schemas
│   │   ├── context/      # Adobe context layer
│   │   └── README.md     # MCP documentation
│   ├── engine/           # Compliance engine (pure functions)
│   └── index.ts          # HTTP server entry point
├── services/             # Frontend services
│   ├── mcpService.ts     # MCP client
│   └── ...
└── components/           # React components
```

## Development

### Scripts

- `npm run dev` - Start frontend development server
- `npm run server` - Start MCP server (with watch mode)
- `npm run server:prod` - Start MCP server (production mode)
- `npm run build` - Build frontend for production

### Testing MCP Tools

```bash
# List available tools
curl http://localhost:3001/mcp/tools

# Health check
curl http://localhost:3001/health
```

## Documentation

- [MCP Server Documentation](server/mcp/README.md) - Detailed MCP server docs
- [Example Payloads](server/mcp/examples/) - Example tool invocations

## License

Private - BrandGuard AI
