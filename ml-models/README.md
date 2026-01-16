# ML Models: Optional Intelligence Layer for BrandGuard AI

This folder contains optional ML-based intelligence components for BrandGuard AI. All ML functionality is **completely optional**, **fail-safe**, and **disabled by default**.

## 🎯 Purpose

The ML layer provides **non-authoritative enhancements** to the deterministic, rule-based compliance engine:

- **Violation Classification**: ML suggests additional potential violations based on learned patterns
- **Compliance Scoring**: ML provides score predictions and risk factor analysis
- **Fix Recommendations**: ML suggests optimal fix strategies and prioritization

**Critical**: The ML layer **never overrides** rule-based results. ML predictions are provided as **metadata only** for informative purposes.

## 🏗️ Architecture

### Backend (`ml-models/backend/`)

Three ML model implementations:

1. **`violationClassifier.ts`**: Classifies violations and suggests additional potential issues
2. **`complianceScorer.ts`**: Enhances compliance scoring with ML predictions
3. **`fixRecommender.ts`**: Recommends optimal fix strategies

All models:
- Accept structured inputs from the compliance engine
- Return predictions with confidence scores and explanations
- **Never throw errors** - always return `null` on failure
- Guarded by `ENABLE_ML` environment variable

### Integration Layer (`server/mlBridge.ts`)

Lightweight bridge that:
- Guards all ML calls with feature flag checks
- Wraps ML results in fail-safe containers
- Ensures errors never propagate to the main system
- Provides clean API for MCP tools to request ML enhancements

### Frontend (`ml-models/frontend/`)

**`mlService.ts`**: Utility service for:
- Extracting ML metadata from MCP responses
- Formatting ML insights for display
- Checking if ML is enabled
- Gracefully handling missing ML data

## 🔧 Integration

### Backend Integration

MCP tools (`server/mcp/tools/`) optionally call `mlBridge` to enrich responses:

```typescript
// Example: analyzeDesign.ts
const mlResult = requestMLViolationClassification(
  violations,
  layers,
  brandProfile
);

if (mlResult.available && mlResult.prediction) {
  metadata.ml = {
    violationClassification: mlResult.prediction,
  };
}
```

ML data is added to `metadata.ml` - **never** modifying the core `result` structure.

### Frontend Integration

The UI (`brandguard-express/src/ui/components/App.tsx`) conditionally displays ML insights:

```typescript
import { extractMLMetadata, isMLEnabled } from "../../../ml-models/frontend/mlService";

if (isMLEnabled() && mlMetadata) {
  // Display ML insights
}
```

ML sections are **hidden** if ML is disabled or unavailable.

## 🚩 Feature Flags

### Backend
- **Environment Variable**: `ENABLE_ML=true`
- **Default**: Disabled (ML returns `null`)

### Frontend
- **Environment Variable**: `VITE_ENABLE_ML=true`
- **Default**: Disabled (ML UI hidden)

## 🔒 Safety Guarantees

1. **No Breaking Changes**: ML is completely additive. Existing API contracts are unchanged.
2. **Fail-Safe**: All ML calls are wrapped in try-catch. Errors return `null`, never throw.
3. **Non-Authoritative**: ML predictions are metadata only. Rule-based results remain authoritative.
4. **Graceful Degradation**: When ML is disabled or fails, the system behaves exactly as before.
5. **Zero Dependencies**: ML models use simple heuristics by default. Actual ML models can be plugged in without changing the interface.

## 📋 Current Implementation

The current implementation uses **heuristic-based placeholders** that simulate ML behavior:

- **Violation Classifier**: Detects color consistency patterns, font mixing patterns
- **Compliance Scorer**: Identifies violation clustering, domain imbalance, severity patterns
- **Fix Recommender**: Prioritizes fixes by severity, domain impact, fix complexity

These placeholders demonstrate the integration pattern and can be replaced with actual ML models (TensorFlow.js, ONNX, etc.) without changing the interface.

## 🔄 Replacing with Real ML Models

To replace heuristics with actual ML models:

1. **Load Model**: In each model file, add model loading logic
2. **Feature Extraction**: Extract features from inputs (violations, layers, brand profile)
3. **Inference**: Run model inference
4. **Post-Process**: Format predictions with confidence scores

Example structure:

```typescript
export function classifyViolations(input: ViolationClassifierInput): ViolationMLPrediction | null {
  if (process.env.ENABLE_ML !== "true") return null;
  
  try {
    // Load model (once, cached)
    const model = await loadModel("violation-classifier.onnx");
    
    // Extract features
    const features = extractFeatures(input);
    
    // Run inference
    const predictions = await model.predict(features);
    
    // Format results
    return formatPredictions(predictions);
  } catch (error) {
    return null; // Fail-safe
  }
}
```

## 📚 API Reference

### Backend ML Models

**Violation Classifier**:
```typescript
classifyViolations(input: ViolationClassifierInput): ViolationMLPrediction | null
```

**Compliance Scorer**:
```typescript
scoreComplianceWithML(input: ComplianceScorerInput): ComplianceMLScore | null
```

**Fix Recommender**:
```typescript
recommendFixes(input: FixRecommenderInput): FixRecommendation | null
```

### ML Bridge

```typescript
requestMLViolationClassification(violations, layers, brandProfile): MLBridgeResult<ViolationMLPrediction>
requestMLComplianceScoring(violations, baseScore, totalElements, layers): MLBridgeResult<ComplianceMLScore>
requestMLFixRecommendations(violations, fixes, baseScore): MLBridgeResult<FixRecommendation>
```

### Frontend Service

```typescript
extractMLMetadata(response: any): MLMetadata | null
hasMLMetadata(response: any): boolean
isMLEnabled(): boolean
formatMLConfidence(confidence: number): string
getMLInsightsSummary(metadata: MLMetadata | null): string | null
```

## 🎓 Why Deterministic Rules Remain Authoritative

Brand compliance is **business-critical**. ML models can:
- Provide helpful insights
- Suggest patterns humans might miss
- Learn from historical data

But they **cannot replace**:
- Explicit brand rules (colors, fonts, logo requirements)
- Deterministic validation (must be 100% reliable)
- Explainable results (why was this flagged?)

The ML layer enhances the system without compromising reliability or explainability.

## 🚀 Production Readiness

This ML layer is designed for:
- ✅ **Hackathon demos**: Show ML capabilities without complexity
- ✅ **Gradual rollout**: Enable ML per-environment via feature flags
- ✅ **A/B testing**: Compare rule-based vs ML-enhanced results
- ✅ **Future expansion**: Easy to add real ML models when ready

The system is **production-safe** because ML is optional and fail-safe by design.
