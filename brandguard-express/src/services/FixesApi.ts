/**
 * Fixes API Adapter
 * 
 * Frontend-safe API adapter for fix suggestions.
 * NO backend references, NO env vars, NO globals.
 * Falls back to mocked data when backend is unavailable.
 */

import { Fix, FixSuggestionsResponse } from '../ui/contexts/FixesContext';

/**
 * Determine if we're in a context where we can make HTTP requests
 * Returns a safe base URL without using env vars or globals
 */
function getApiBaseUrl(): string {
  // Try relative path first (works if backend is proxied or same origin)
  // In Adobe Express, this might not work, so we'll fall back to mocked data
  try {
    // Use relative path - safe and doesn't require env vars
    return '/api';
  } catch {
    // If we can't determine, return empty string to trigger fallback
    return '';
  }
}

/**
 * Attempt to make a fetch request with timeout and error handling
 * Returns null if request fails (triggers fallback)
 */
async function safeFetch(url: string, options: RequestInit): Promise<Response | null> {
  try {
    // Try the request with a reasonable timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    // Network error, CORS error, or timeout - return null to trigger fallback
    console.warn('API request failed, using fallback:', error);
    return null;
  }
}

/**
 * Generate mock fix suggestions based on compliance results
 * This is used when backend is unavailable
 */
function generateMockFixes(
  complianceResults?: any,
  brandId?: string
): FixSuggestionsResponse {
  const violations = complianceResults?.violations || [];
  const fixes: Fix[] = [];

  // Generate mock fixes from violations
  for (const violation of violations) {
    if (violation.ruleId === 'brand_colors' || violation.domain === 'visual') {
      fixes.push({
        id: `mock-fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'color',
        severity: violation.severity || 'warning',
        title: 'Update color to brand standard',
        description: `Change from ${violation.currentValue || 'current'} to brand-approved color.`,
        currentValue: violation.currentValue || '',
        recommendedValue: '#0057B8', // Mock brand color
        reasoning: 'This color is not in the approved brand palette. Use brand-approved colors for consistency.',
        autoFixable: violation.autoFixable !== false,
        elementId: violation.elementId || '',
        metadata: {
          guidelineSource: 'Brand Guidelines (Mock)',
          brandRule: 'Use approved brand colors',
        },
      });
    } else if (violation.ruleId === 'brand_typography' || violation.domain === 'content') {
      fixes.push({
        id: `mock-fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'typography',
        severity: violation.severity || 'critical',
        title: 'Update font to brand standard',
        description: `Change font to brand-approved typeface.`,
        currentValue: violation.currentValue || '',
        recommendedValue: 'Inter, Arial, sans-serif',
        reasoning: 'Typography must match brand guidelines for visual consistency.',
        autoFixable: violation.autoFixable !== false,
        elementId: violation.elementId || '',
        metadata: {
          guidelineSource: 'Brand Guidelines (Mock)',
          brandRule: 'Use approved brand fonts',
        },
      });
    }
  }

  // If no violations, create a generic success message
  if (fixes.length === 0 && complianceResults?.score && complianceResults.score < 100) {
    fixes.push({
      id: `mock-fix-generic-${Date.now()}`,
      type: 'generic',
      severity: 'info',
      title: 'Review design for brand compliance',
      description: 'Consider reviewing design elements against brand guidelines.',
      currentValue: '',
      recommendedValue: '',
      reasoning: 'Ensure all design elements comply with brand standards.',
      autoFixable: false,
      elementId: '',
      metadata: {
        guidelineSource: 'Brand Guidelines (Mock)',
      },
    });
  }

  return {
    fixes,
    potentialScoreIncrease: fixes.length * 10,
    summary: {
      totalFixes: fixes.length,
      criticalFixes: fixes.filter((f) => f.severity === 'critical').length,
      warningFixes: fixes.filter((f) => f.severity === 'warning').length,
      autoFixable: fixes.filter((f) => f.autoFixable).length,
      manualReview: fixes.filter((f) => !f.autoFixable).length,
    },
  };
}

/**
 * Generate fix suggestions
 */
export async function generateFixes(
  designId: string,
  brandId: string,
  industry: string = 'general',
  complianceResults?: any,
  design?: any,
  brandRules?: any
): Promise<FixSuggestionsResponse> {
  const baseUrl = getApiBaseUrl();
  
  // If no base URL or we're in a restricted environment, use mocked data
  if (!baseUrl || !baseUrl.startsWith('/')) {
    return generateMockFixes(complianceResults, brandId);
  }

  const response = await safeFetch(`${baseUrl}/fixes/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      designId,
      brandId,
      industry,
      complianceResults,
      design,
      brandRules,
    }),
  });

  // If request failed, fall back to mocked data
  if (!response || !response.ok) {
    return generateMockFixes(complianceResults, brandId);
  }

  try {
    const data = await response.json();
    if (data.success && data.data) {
      return data.data;
    }
  } catch (error) {
    console.warn('Failed to parse API response, using fallback:', error);
  }

  // Fallback to mocked data
  return generateMockFixes(complianceResults, brandId);
}

/**
 * Apply a fix
 */
export async function applyFix(
  fixId: string,
  designId: string,
  design?: any
): Promise<{ commands: any[] } | null> {
  const baseUrl = getApiBaseUrl();
  
  if (!baseUrl || !baseUrl.startsWith('/')) {
    // Return mock commands for frontend-only mode
    return {
      commands: [
        {
          action: 'updateElement',
          elementId: design?.layers?.[0]?.id || 'mock-element',
          updates: {},
          metadata: { fixId, note: 'Mock command - backend unavailable' },
        },
      ],
    };
  }

  const response = await safeFetch(`${baseUrl}/fixes/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fixId,
      designId,
      design,
    }),
  });

  if (!response || !response.ok) {
    return null;
  }

  try {
    const data = await response.json();
    if (data.success && data.data) {
      return { commands: data.data.commands || [] };
    }
  } catch (error) {
    console.warn('Failed to parse apply response:', error);
  }

  return null;
}

/**
 * Apply multiple fixes
 */
export async function applyAllFixes(
  fixIds: string[],
  designId: string,
  design?: any
): Promise<{ commands: any[] } | null> {
  const baseUrl = getApiBaseUrl();
  
  if (!baseUrl || !baseUrl.startsWith('/')) {
    // Return mock commands for frontend-only mode
    return {
      commands: fixIds.map((fixId) => ({
        action: 'updateElement',
        elementId: design?.layers?.[0]?.id || 'mock-element',
        updates: {},
        metadata: { fixId, note: 'Mock command - backend unavailable' },
      })),
    };
  }

  const response = await safeFetch(`${baseUrl}/fixes/apply-all`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fixIds,
      designId,
      design,
    }),
  });

  if (!response || !response.ok) {
    return null;
  }

  try {
    const data = await response.json();
    if (data.success && data.data) {
      return { commands: data.data.commands || [] };
    }
  } catch (error) {
    console.warn('Failed to parse apply-all response:', error);
  }

  return null;
}

/**
 * Get fix preview
 */
export async function getFixPreview(
  fixId: string,
  designId: string
): Promise<any | null> {
  const baseUrl = getApiBaseUrl();
  
  if (!baseUrl || !baseUrl.startsWith('/')) {
    // Return mock preview
    return {
      preview: {
        elementId: 'mock-element',
        fixType: 'color',
        currentValue: 'Current',
        recommendedValue: 'Recommended',
        changes: {
          property: 'fill',
          before: 'Current',
          after: 'Recommended',
        },
      },
    };
  }

  const response = await safeFetch(`${baseUrl}/fixes/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fixId,
      designId,
    }),
  });

  if (!response || !response.ok) {
    return null;
  }

  try {
    const data = await response.json();
    if (data.success && data.data) {
      return data.data;
    }
  } catch (error) {
    console.warn('Failed to parse preview response:', error);
  }

  return null;
}

/**
 * Get fixes for a design
 */
export async function getFixesByDesign(designId: string): Promise<Fix[]> {
  const baseUrl = getApiBaseUrl();
  
  if (!baseUrl || !baseUrl.startsWith('/')) {
    return [];
  }

  const response = await safeFetch(`${baseUrl}/fixes/${designId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response || !response.ok) {
    return [];
  }

  try {
    const data = await response.json();
    if (data.success && data.data) {
      return data.data.fixes || [];
    }
  } catch (error) {
    console.warn('Failed to parse fixes response:', error);
  }

  return [];
}
