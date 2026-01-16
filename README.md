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
- **Grammarly-Style Auto-Fix**: Dynamic fix suggestions from brand guidelines (NEW)
- **Database-Driven Configuration**: All brand standards and industry rules from database (NEW)
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

### Quick Start (All Services)

**Windows Users:**
```bash
# Start all services at once
start-all.bat
```

**Manual Start (All Platforms):**

1. **Install Dependencies**

```bash
# Install root dependencies (if any)
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../brandguard-express
npm install

# Install MCP server dependencies
cd ../server
npm install
```

2. **Configure Environment**

Create a `.env.local` file in the root directory (optional):

```bash
GEMINI_API_KEY=your_gemini_api_key_here  # Optional for AI features
```

Create `backend/.env` file (copy from `backend/env.example`):

```bash
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here  # Optional
```

3. **Start All Services**

You need **3 terminal windows** running simultaneously:

**Terminal 1 - Backend Server:**
```bash
cd backend
npm start
# Server runs on http://localhost:3000
```

**Terminal 2 - MCP Server:**
```bash
cd server
npm run dev
# Server runs on http://localhost:3001
```

**Terminal 3 - Adobe Express Add-on:**
```bash
cd brandguard-express
npm start
# Add-on dev server runs on https://localhost:5241
```

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

## Testing Guide

### Step-by-Step Testing

#### 1. Verify Backend Server is Running

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "ok",
#   "service": "BrandGuard AI Backend",
#   "timestamp": "2024-01-15T10:30:00.000Z"
# }
```

**Test Backend API Endpoints:**

```bash
# Test analyze endpoint
curl -X POST http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "design": {
      "layers": [
        {
          "id": "layer-1",
          "type": "text",
          "fill": "#FF0000",
          "fontFamily": "Arial",
          "content": "Test content"
        }
      ]
    },
    "brandRules": {
      "brandId": "default-brand",
      "visual": {
        "colors": ["#0057B8", "#FFFFFF"],
        "fonts": ["Inter", "Arial"],
        "logo": { "minWidth": 100 }
      },
      "content": {
        "tone": "professional",
        "forbiddenPhrases": [],
        "locale": "en-US"
      }
    }
  }'
```

#### 2. Verify MCP Server is Running

```bash
# Health check
curl http://localhost:3001/health

# List available MCP tools
curl http://localhost:3001/mcp/tools

# Test MCP tool invocation
curl -X POST http://localhost:3001/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "analyze_design",
    "input": {
      "design": {
        "designId": "test-123",
        "canvas": { "width": 1920, "height": 1080 },
        "layers": [
          {
            "id": "layer-1",
            "type": "text",
            "fill": "#FF0000",
            "fontFamily": "Comic Sans",
            "width": 100,
            "height": 50,
            "x": 0,
            "y": 0
          }
        ]
      },
      "brandRules": {
        "brandId": "default-brand",
        "visual": {
          "colors": ["#0057B8", "#FFFFFF"],
          "fonts": ["Inter", "Arial"],
          "logo": { "minWidth": 100, "aspectRatio": 2.0, "padding": 20 }
        },
        "content": {
          "tone": "professional",
          "forbiddenPhrases": [],
          "locale": "en-US"
        }
      }
    }
  }'
```

#### 3. Test Auto-Fix Feature (NEW)

**Generate Fix Suggestions:**

```bash
curl -X POST http://localhost:3000/api/fixes/generate \
  -H "Content-Type: application/json" \
  -d '{
    "designId": "test-design-123",
    "brandId": "default-brand",
    "industry": "general",
    "complianceResults": {
      "violations": [
        {
          "id": "color-violation-1",
          "ruleId": "brand_colors",
          "domain": "visual",
          "severity": "warning",
          "elementId": "layer-1",
          "currentValue": "#FF0000",
          "autoFixable": true
        }
      ],
      "score": 75,
      "design": {
        "layers": [
          {
            "id": "layer-1",
            "type": "text",
            "fill": "#FF0000",
            "fontFamily": "Arial"
          }
        ]
      }
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "fixes": [
      {
        "id": "fix-...",
        "type": "color",
        "severity": "warning",
        "title": "Update color to brand standard",
        "description": "Change from #FF0000 to Primary Blue (#0057B8)...",
        "currentValue": "#FF0000",
        "recommendedValue": "#0057B8",
        "autoFixable": true,
        "elementId": "layer-1",
        "metadata": {
          "guidelineSource": "Brand Guidelines - Color Palette",
          "brandColorName": "Primary Blue",
          "brandColorType": "primary"
        }
      }
    ],
    "potentialScoreIncrease": 15,
    "summary": {
      "totalFixes": 1,
      "criticalFixes": 0,
      "warningFixes": 1,
      "autoFixable": 1,
      "manualReview": 0
    }
  }
}
```

**Get Fix Suggestions for a Design:**

```bash
curl http://localhost:3000/api/fixes/test-design-123
```

**Preview a Fix:**

```bash
curl -X POST http://localhost:3000/api/fixes/preview \
  -H "Content-Type: application/json" \
  -d '{
    "fixId": "fix-1234567890",
    "designId": "test-design-123"
  }'
```

**Apply a Fix:**

```bash
curl -X POST http://localhost:3000/api/fixes/apply \
  -H "Content-Type: application/json" \
  -d '{
    "fixId": "fix-1234567890",
    "designId": "test-design-123",
    "design": {
      "layers": [
        {
          "id": "layer-1",
          "type": "text",
          "fill": "#FF0000"
        }
      ]
    }
  }'
```

#### 4. Test Adobe Express Add-on

1. **Open Adobe Express:**
   - Navigate to https://new.express.adobe.com
   - Sign in with your Adobe account

2. **Load the Add-on:**
   - Open or create a design
   - Open the **Add-ons** panel (from the left sidebar)
   - Click **"Load Local Add-on"** or **"Development Mode"**
   - Select the `brandguard-express` folder

3. **Test Compliance Analysis:**
   - Configure brand profile in the add-on panel:
     - Tone Preference: `professional`
     - Claims Strictness: `medium`
     - Disallowed Phrases: `free, best ever, 100% guaranteed`
   - Click **"Analyze Brand Compliance"**
   - Review the compliance score and issues list

4. **Test Auto-Fix Feature (NEW):**
   - After analysis, if score < 100%, click **"View Suggested Fixes"**
   - Review the fixes panel:
     - Fixes are grouped by severity (Critical, Warning, Info)
     - Each fix shows:
       - Current value vs Recommended value
       - Reasoning for the fix
       - Source (Brand Guidelines or Industry Standards)
   - Select fixes to apply (checkboxes for auto-fixable fixes)
   - Click **"Apply Selected"** or **"Apply Fix"** on individual fixes
   - Fixes are applied to the Adobe Express canvas
   - Re-analyze to see updated score

5. **Verify Fixes Applied:**
   - Check that colors, fonts, sizes have been updated on canvas
   - Re-run compliance analysis to see improved score
   - Check "Applied Fixes" section to see history

### End-to-End Test Flow

**Complete Workflow:**

1. ✅ Start all 3 servers (backend, MCP, add-on)
2. ✅ Open Adobe Express and load local add-on
3. ✅ Create a design with non-brand colors (e.g., red #FF0000 instead of brand blue)
4. ✅ Run compliance analysis → Should detect violations
5. ✅ Click "View Suggested Fixes" → Should show fix suggestions
6. ✅ Review fix details → Should show current vs recommended values from DB
7. ✅ Apply a fix → Should update canvas element
8. ✅ Re-analyze → Should show improved score

### Testing Checklist

**Backend Server:**
- [ ] Health endpoint returns OK
- [ ] `/analyze` endpoint processes design data
- [ ] `/api/fixes/generate` generates fix suggestions
- [ ] `/api/fixes/apply` returns Adobe Express SDK commands
- [ ] All responses use values from database (no hardcoded values)

**MCP Server:**
- [ ] Health endpoint returns OK
- [ ] `/mcp/tools` lists available tools
- [ ] `/mcp/invoke` executes tools correctly
- [ ] Tool responses are structured and deterministic

**Adobe Express Add-on:**
- [ ] Add-on loads in Adobe Express
- [ ] Brand profile editor displays correctly
- [ ] Compliance analysis runs and shows results
- [ ] "View Fixes" button appears when score < 100%
- [ ] Fixes panel displays dynamic fix suggestions
- [ ] Fix cards show correct before/after values
- [ ] Applying fixes updates the canvas
- [ ] Re-analysis shows improved scores

**Auto-Fix Feature:**
- [ ] Fix suggestions are generated from database
- [ ] No hardcoded colors, fonts, or sizes
- [ ] Brand guidelines are respected
- [ ] Industry standards are applied
- [ ] Fix commands are generated dynamically
- [ ] Fixes are applied correctly to canvas

## Development

### Scripts

**Backend:**
- `cd backend && npm start` - Start backend server
- `cd backend && npm run dev` - Start with auto-reload (nodemon)

**MCP Server:**
- `cd server && npm run dev` - Start MCP server (with watch mode)
- `cd server && npm run build` - Build TypeScript to JavaScript
- `cd server && npm start` - Start production build

**Adobe Express Add-on:**
- `cd brandguard-express && npm start` - Start add-on dev server
- `cd brandguard-express && npm run build` - Build for production
- `cd brandguard-express && npm run package` - Package add-on

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              Adobe Express (Browser)                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  BrandGuard Add-on (React + TypeScript)         │   │
│  │  - Compliance Analysis UI                        │   │
│  │  - Auto-Fix Panel (NEW)                          │   │
│  │  - Fix Cards & Preview (NEW)                     │   │
│  └────────────┬─────────────────────────────────────┘   │
└───────────────┼──────────────────────────────────────────┘
                │ HTTP
                ├──────────────────────────────────────────┐
                │                                          │
┌───────────────▼──────────────────────────┐  ┌───────────▼──────────────┐
│  Backend Server (Node.js + Express)     │  │  MCP Server (TypeScript) │
│  Port: 3000                              │  │  Port: 3001              │
│  ┌────────────────────────────────────┐  │  │  ┌────────────────────┐  │
│  │  Routes:                           │  │  │  │  MCP Tools:        │  │
│  │  - /analyze                        │  │  │  │  - analyze_design  │  │
│  │  - /api/fixes/generate (NEW)       │  │  │  │  - score_compliance│  │
│  │  - /api/fixes/apply (NEW)          │  │  │  │  - apply_fixes     │  │
│  │  - /api/fixes/apply-all (NEW)      │  │  │  │  - validate_brand  │  │
│  └────────────┬───────────────────────┘  │  │  └────────────────────┘  │
│               │                           │  └──────────────────────────┘
│  ┌────────────▼───────────────────────┐  │
│  │  Services:                         │  │
│  │  - complianceEngine                │  │
│  │  - brandGuidelinesService (NEW)    │  │
│  │  - fixSuggestionGenerator (NEW)    │  │
│  │  - fixApplicator (NEW)             │  │
│  └────────────┬───────────────────────┘  │
└───────────────┼──────────────────────────┘
                │
┌───────────────▼──────────────────────────┐
│  Database Models (In-Memory/DB)         │
│  - BrandGuideline (NEW)                  │
│  - IndustryStandard (NEW)                │
│  - FixSuggestion (NEW)                   │
└──────────────────────────────────────────┘
```

## Documentation

- [MCP Server Documentation](server/mcp/README.md) - Detailed MCP server docs
- [Auto-Fix Feature Documentation](AUTO_FIX_FEATURE.md) - Complete auto-fix feature guide
- [Example Payloads](server/mcp/examples/) - Example tool invocations
- [Backend README](backend/README.md) - Backend server documentation
- [Adobe Express Add-on README](brandguard-express/README.md) - Add-on setup guide

## Troubleshooting

### Backend Server Won't Start

**Check:**
- Node.js version is 18+ (`node --version`)
- Port 3000 is not already in use
- Dependencies are installed (`cd backend && npm install`)
- `.env` file exists in `backend/` folder

### MCP Server Won't Start

**Check:**
- TypeScript is installed globally or locally
- Port 3001 is not already in use
- Dependencies are installed (`cd server && npm install`)
- Run `npm run build` first, then `npm start`

### Adobe Express Add-on Won't Load

**Check:**
- Add-on dev server is running (`cd brandguard-express && npm start`)
- Browser console for errors
- Adobe Express allows local add-ons (development mode)
- HTTPS certificate is accepted for `https://localhost:5241`

### Auto-Fix Feature Not Working

**Check:**
- Backend server is running on port 3000
- Fix suggestions API responds: `curl http://localhost:3000/api/fixes/test-design-123`
- Browser console for API errors
- Network tab shows successful API calls
- Brand guidelines are initialized in database models (in-memory seed data)

### Fixes Not Applying to Canvas

**Check:**
- Sandbox proxy is passed to FixCard component
- Adobe Express SDK is available in browser
- Browser console for SDK errors
- Design layers are accessible via sandbox API

## License

Private - BrandGuard AI
