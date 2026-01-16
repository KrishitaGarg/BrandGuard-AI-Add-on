/**
 * Autofix Service (Frontend)
 * 
 * Calls backend autofix endpoint and applies fixes to canvas.
 */

export interface AutofixRequest {
  text: string;
  issues: any[];
  brandGuidelines: {
    preferredTerms: Record<string, string>;
    disallowedTerms: string[];
    toneRules?: string[];
  };
}

export interface AutofixResponse {
  success: boolean;
  fixedText: string;
  appliedFixes: Array<{
    type: string;
    issue: string;
    before: string;
    after: string;
    applied: boolean;
  }>;
  changed: boolean;
  error?: string;
}

/**
 * Call backend autofix endpoint
 */
export async function applyAutofix(request: AutofixRequest): Promise<AutofixResponse> {
  try {
    // Use relative path (works if backend is proxied or same origin)
    // Backend route is POST /apply-fix
    const response = await fetch('/apply-fix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Autofix failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling autofix:', error);
    return {
      success: false,
      fixedText: request.text,
      appliedFixes: [],
      changed: false,
      error: error instanceof Error ? error.message : 'Autofix unavailable',
    };
  }
}
