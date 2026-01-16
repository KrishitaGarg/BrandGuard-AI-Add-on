# Grammarly-Style Auto-Fix Feature Documentation

## Overview

This document describes the **NEW** Grammarly-style auto-fix feature added to BrandGuard AI. This feature is completely modular and does **NOT** modify any existing functionality.

## Architecture

### Backend Services

#### 1. Database Models (In-Memory for Development)
- **`BrandGuideline.js`**: Stores brand standards (colors, typography, logo, spacing)
- **`IndustryStandard.js`**: Stores industry-specific standards (accessibility, legal, best practices)
- **`FixSuggestion.js`**: Caches generated fix suggestions

**Location**: `backend/src/models/`

#### 2. Services
- **`brandGuidelinesService.js`**: Fetches brand guidelines from database (NO HARDCODED VALUES)
- **`industryStandardsService.js`**: Fetches industry standards from database (NO HARDCODED VALUES)
- **`fixSuggestionGenerator.js`**: Generates dynamic fix suggestions based on compliance results + database guidelines
- **`fixApplicator.js`**: Generates Adobe Express SDK commands dynamically

**Location**: `backend/src/services/`

#### 3. API Routes
- **`POST /api/fixes/generate`**: Generate fix suggestions
- **`POST /api/fixes/apply`**: Apply a single fix
- **`POST /api/fixes/apply-all`**: Apply multiple fixes in batch
- **`POST /api/fixes/preview`**: Get preview of changes
- **`GET /api/fixes/:designId`**: Get all fixes for a design

**Location**: `backend/src/routes/fixSuggestions.js`

### Frontend Components

#### 1. Context & Hooks
- **`FixesContext.tsx`**: React context for managing fix state
- **`useFixes()`**: Hook to access fixes context

**Location**: `brandguard-express/src/ui/contexts/`

#### 2. Components
- **`FixesPanel.tsx`**: Main panel displaying all fix suggestions
- **`FixCard.tsx`**: Individual fix card component
- **`FixesPanel.css`**: Styling for fixes panel
- **`FixCard.css`**: Styling for fix cards

**Location**: `brandguard-express/src/ui/components/fixes/`

#### 3. Integration Service
- **`adobeExpressIntegration.ts`**: Executes Adobe Express SDK commands dynamically

**Location**: `brandguard-express/src/services/`

## Key Features

### ✅ Dynamic Configuration (No Hardcoding)
- All brand standards come from database
- All industry standards come from database
- Fix suggestions are generated dynamically based on actual guidelines
- No hardcoded colors, fonts, sizes, or other values

### ✅ Modular Architecture
- New feature doesn't modify existing code
- Uses middleware/wrapper pattern
- Existing compliance engine unchanged
- Existing API endpoints unchanged

### ✅ Grammarly-Style UX
- Visual fix cards with severity indicators
- Before/after value comparison
- Reasoning for each fix
- One-click apply functionality
- Batch apply multiple fixes
- Preview changes before applying

## Data Flow

```
1. User clicks "Analyze Brand Compliance" (existing functionality)
   ↓
2. Compliance analysis runs (existing)
   ↓
3. If score < 100%, "View Suggested Fixes" button appears (NEW)
   ↓
4. User clicks button → FixesPanel loads (NEW)
   ↓
5. Backend generates fixes:
   - Fetches brand guidelines from database
   - Fetches industry standards from database
   - Compares compliance violations against guidelines
   - Generates dynamic fix suggestions
   ↓
6. Frontend displays fixes in categorized cards (NEW)
   ↓
7. User selects fixes and clicks "Apply" (NEW)
   ↓
8. Backend generates Adobe Express SDK commands dynamically (NEW)
   ↓
9. Frontend executes commands on canvas (NEW)
   ↓
10. Re-analyze design (existing functionality)
```

## Database Schema

### Brand Guidelines Table
```sql
CREATE TABLE brand_guidelines (
  id UUID PRIMARY KEY,
  brand_id UUID REFERENCES brands(id),
  guideline_type VARCHAR, -- 'color', 'typography', 'logo', 'spacing', 'imagery', 'layout'
  rules JSONB, -- Dynamic rules structure
  priority INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Industry Standards Table
```sql
CREATE TABLE industry_standards (
  id UUID PRIMARY KEY,
  industry VARCHAR, -- 'finance', 'healthcare', 'retail', 'general'
  standard_type VARCHAR, -- 'accessibility', 'legal', 'best_practice'
  requirements JSONB, -- Dynamic requirements
  compliance_level VARCHAR, -- 'required', 'recommended', 'optional'
  created_at TIMESTAMP
);
```

### Fix Suggestions Table
```sql
CREATE TABLE fix_suggestions (
  id UUID PRIMARY KEY,
  design_id UUID,
  brand_id UUID,
  fix_data JSONB, -- Complete fix object
  applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMP,
  created_at TIMESTAMP
);
```

## Current Implementation (In-Memory)

The current implementation uses **in-memory storage** for development. To use a real database:

1. Replace model functions with actual database queries
2. Update `getBrandGuidelines()`, `getIndustryStandards()`, etc. to use your ORM/database driver
3. All other code remains unchanged (service layer abstracts database details)

## Example Fix Generation

### Input (from compliance analysis):
```javascript
{
  violations: [
    {
      id: "color-001",
      ruleId: "brand_colors",
      domain: "visual",
      severity: "warning",
      elementId: "layer-123",
      currentValue: "#FF0000"
    }
  ],
  score: 75
}
```

### Output (dynamic fix suggestion):
```javascript
{
  fixes: [
    {
      id: "fix-001",
      type: "color",
      severity: "warning",
      title: "Update color to brand standard",
      description: "Change from #FF0000 to Primary Blue (#0057B8) to match brand guidelines.",
      currentValue: "#FF0000",
      recommendedValue: "#0057B8", // FROM DATABASE
      reasoning: "Brand guidelines specify Primary Blue as the primary color...",
      autoFixable: true,
      elementId: "layer-123",
      metadata: {
        guidelineSource: "Brand Guidelines - Color Palette",
        brandColorName: "Primary Blue", // FROM DATABASE
        brandColorType: "primary" // FROM DATABASE
      }
    }
  ]
}
```

## Integration Points

### Modified Files (Minimal Changes)
1. **`backend/src/server.js`**: Added route registration (2 lines)
2. **`brandguard-express/src/ui/index.tsx`**: Wrapped App with FixesProvider (2 lines)
3. **`brandguard-express/src/ui/components/App.tsx`**: Added "View Fixes" button and FixesPanel (30 lines)

### New Files Created
- 3 database models
- 4 backend services
- 1 API route file
- 1 frontend context
- 4 frontend components
- 1 integration service
- 2 CSS files

**Total**: ~2,500 lines of new code, ~35 lines modified in existing files

## Testing

1. **Start Backend**: `cd backend && npm start`
2. **Start Frontend**: `cd brandguard-express && npm start`
3. **Test Flow**:
   - Run compliance analysis
   - If score < 100%, "View Suggested Fixes" button appears
   - Click button to see fixes panel
   - Fixes are generated dynamically from database
   - Click "Apply Fix" to execute changes

## Future Enhancements

1. **Replace in-memory storage** with real database (PostgreSQL, MongoDB, etc.)
2. **Admin panel** to manage brand guidelines
3. **Industry standards upload** interface
4. **Fix history** tracking
5. **Undo/redo** functionality
6. **Bulk import** brand guidelines from PDF/image

## Notes

- **NO HARDCODED VALUES**: All colors, fonts, sizes come from database
- **MODULAR**: Doesn't break existing functionality
- **EXTENSIBLE**: Easy to add new fix types
- **TYPE-SAFE**: Full TypeScript support in frontend
- **FAIL-SAFE**: Errors don't break existing compliance engine
