/**
 * AI Suggestions API Service
 * 
 * Frontend-safe API adapter for AI creative suggestions.
 * Uses absolute backend URL (required for Adobe Express).
 */

export interface AISuggestionsRequest {
  canvasData: {
    layers: Array<{
      type?: string;
      text?: string;
      content?: string;
      fill?: any;
    }>;
    canvas?: any;
  };
  brandProfile: any;
  complianceResult?: any;
}

export interface AISuggestionsResponse {
  success: boolean;
  data?: {
    headlineSuggestions: string[];
    bodyCopySuggestions: string[];
    ctaSuggestions: string[];
    supportingCopySuggestions: string[];
  };
  error?: string;
}

/**
 * Generate AI creative suggestions
 */
export async function generateAISuggestions(
  request: AISuggestionsRequest
): Promise<AISuggestionsResponse> {
  try {
    // Adobe Express does NOT proxy relative /api paths
    const response = await fetch(
      'http://localhost:3000/api/ai-suggestions/generate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      throw new Error(`Suggestions request failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling AI suggestions API:', error);

    return {
      success: false,
      data: {
        headlineSuggestions: [],
        bodyCopySuggestions: [],
        ctaSuggestions: [],
        supportingCopySuggestions: [],
      },
      error:
        error instanceof Error
          ? error.message
          : 'Suggestions unavailable',
    };
  }
}
