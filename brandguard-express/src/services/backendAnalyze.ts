/**
 * Backend Analyze Service
 * 
 * Calls backend /analyze endpoint to get violations with fixAction.
 * Frontend-safe: uses relative path, no env vars.
 */

/**
 * Call backend /analyze endpoint
 */
export async function analyzeDesign(
  design: { layers: any[]; canvas?: any },
  brandRules: any
): Promise<any> {
  try {
    // Use relative path (works if backend is proxied)
    // In production, this would be configured via proxy or same-origin
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        design,
        brandRules,
      }),
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling backend /analyze:', error);
    // Return empty result if backend unavailable
    return {
      result: {
        legacy: {
          violations: [],
          brandScore: 100,
          summary: {
            totalViolations: 0,
            byDomain: { visual: 0, content: 0 },
            bySeverity: { critical: 0, warning: 0 },
          },
        },
      },
      error: error instanceof Error ? error.message : 'Backend unavailable',
    };
  }
}

/**
 * Extract violations with fixAction from analyze response
 */
export function extractViolations(analyzeResponse: any): any[] {
  if (!analyzeResponse || !analyzeResponse.result) {
    return [];
  }

  // Extract violations from legacy format
  const violations = analyzeResponse.result.legacy?.violations || [];
  
  // Ensure all violations have required fields
  return violations.map((v: any) => ({
    id: v.id || `violation-${Date.now()}-${Math.random()}`,
    type: v.ruleId || v.type || 'generic',
    severity: v.severity || 'warning',
    title: v.message || 'Compliance Issue',
    description: v.businessContext?.reason || v.message || '',
    currentValue: v.currentValue || '',
    recommendedValue: v.suggestedValue || '',
    reasoning: v.businessContext?.outcome || v.businessContext?.reason || '',
    autoFixable: v.autoFixable || false,
    elementId: v.elementId || '',
    fixAction: v.fixAction || null, // Backend-provided fix action
    metadata: {
      domain: v.domain,
      ruleId: v.ruleId,
    },
  }));
}
