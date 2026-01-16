/**
 * AI Suggestions Panel Component
 * 
 * Displays creative content suggestions based on brand guidelines.
 * Additive recommendations, separate from compliance fixes.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@swc-react/button';
import type { DocumentSandboxApi } from '../../models/DocumentSandboxApi';
import { generateAISuggestions } from '../../services/aiSuggestionsApi';
import type { BrandProfile } from '../../brandProfile';

interface AISuggestionsPanelProps {
  canvasData: { layers: any[]; canvas?: any };
  brandProfile: BrandProfile;
  complianceResult?: any;
  sandboxProxy: DocumentSandboxApi;
}

export default function AISuggestionsPanel({
  canvasData,
  brandProfile,
  complianceResult,
  sandboxProxy,
}: AISuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<{
    headlineSuggestions: string[];
    bodyCopySuggestions: string[];
    ctaSuggestions: string[];
    supportingCopySuggestions: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSuggestions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await generateAISuggestions({
        canvasData,
        brandProfile,
        complianceResult,
      });

      if (result.success && result.data) {
        setSuggestions(result.data);
      } else {
        setError(result.error || 'Failed to load suggestions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Load suggestions when component mounts or data changes
  useEffect(() => {
    if (canvasData && brandProfile) {
      loadSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasData?.layers?.length, brandProfile.tonePreference]);

  const handleApplySuggestion = async (text: string) => {
    try {
      // Get current design to find a text layer or create new one
      const design = await sandboxProxy.getDesign();
      const textLayers = design.layers?.filter(layer => layer.type === 'text') || [];
      
      if (textLayers.length > 0) {
        // Update first text layer with suggestion
        const firstTextLayer = textLayers[0];
        await sandboxProxy.applyTextFix({
          layerId: firstTextLayer.id,
          fixedText: text,
          originalText: firstTextLayer.content || '',
        });
      } else {
        // Create new text layer via setDesign
        const updatedLayers = [
          ...(design.layers || []),
          {
            id: `text-${Date.now()}`,
            type: 'text',
            content: text,
          }
        ];
        await sandboxProxy.setDesign({
          layers: updatedLayers,
          canvas: design.canvas,
        });
      }
      
      console.log('[AISuggestions] Applied suggestion to canvas:', text);
      
      // Refresh canvas data after applying
      const updatedDesign = await sandboxProxy.getDesign();
      setCanvasData({
        layers: updatedDesign.layers || [],
        canvas: updatedDesign.canvas
      });
    } catch (error) {
      console.error('Error applying suggestion:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '16px', fontSize: '13px', color: '#888', textAlign: 'center' }}>
        Generating suggestions...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px', fontSize: '13px', color: '#d32f2f' }}>
        Error: {error}
      </div>
    );
  }

  if (!suggestions) {
    return (
      <div style={{ padding: '16px', fontSize: '13px', color: '#888', textAlign: 'center' }}>
        No suggestions available. Click "Generate Suggestions" to get started.
        <div style={{ marginTop: '8px' }}>
          <Button
            variant="secondary"
            onClick={loadSuggestions}
            style={{ fontSize: '12px', padding: '5px 11px' }}
          >
            Generate Suggestions
          </Button>
        </div>
      </div>
    );
  }

  const hasAnySuggestions = 
    suggestions.headlineSuggestions.length > 0 ||
    suggestions.bodyCopySuggestions.length > 0 ||
    suggestions.ctaSuggestions.length > 0 ||
    suggestions.supportingCopySuggestions.length > 0;

  if (!hasAnySuggestions) {
    return (
      <div style={{ padding: '16px', fontSize: '13px', color: '#888', textAlign: 'center' }}>
        No suggestions generated. Try generating again.
        <div style={{ marginTop: '8px' }}>
          <Button
            variant="secondary"
            onClick={loadSuggestions}
            style={{ fontSize: '12px', padding: '5px 11px' }}
          >
            Regenerate
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '12px',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#2c2c2c', letterSpacing: '-0.01em' }}>
          AI Creative Suggestions
        </h4>
        <Button
          variant="secondary"
          onClick={loadSuggestions}
          disabled={loading}
          style={{ fontSize: '12px', padding: '5px 11px' }}
        >
          {loading ? 'Generating...' : 'Refresh'}
        </Button>
      </div>

      {suggestions.headlineSuggestions.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Headline Options
          </div>
          {suggestions.headlineSuggestions.map((suggestion, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px',
                backgroundColor: '#fafafa',
                borderRadius: '4px',
                marginBottom: '8px',
                border: '1px solid #e8e8e8'
              }}
            >
              <div style={{ color: '#2c2c2c', fontSize: '13px', marginBottom: '8px', lineHeight: '1.5' }}>
                {suggestion}
              </div>
              <Button
                variant="secondary"
                onClick={() => handleApplySuggestion(suggestion)}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                Use This
              </Button>
            </div>
          ))}
        </div>
      )}

      {suggestions.bodyCopySuggestions.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Body Copy
          </div>
          {suggestions.bodyCopySuggestions.map((suggestion, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px',
                backgroundColor: '#fafafa',
                borderRadius: '4px',
                marginBottom: '8px',
                border: '1px solid #e8e8e8'
              }}
            >
              <div style={{ color: '#2c2c2c', fontSize: '13px', marginBottom: '8px', lineHeight: '1.5' }}>
                {suggestion}
              </div>
              <Button
                variant="secondary"
                onClick={() => handleApplySuggestion(suggestion)}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                Use This
              </Button>
            </div>
          ))}
        </div>
      )}

      {suggestions.ctaSuggestions.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Call-to-Action Options
          </div>
          {suggestions.ctaSuggestions.map((suggestion, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px',
                backgroundColor: '#fafafa',
                borderRadius: '4px',
                marginBottom: '8px',
                border: '1px solid #e8e8e8'
              }}
            >
              <div style={{ color: '#2c2c2c', fontSize: '13px', marginBottom: '8px', lineHeight: '1.5' }}>
                {suggestion}
              </div>
              <Button
                variant="secondary"
                onClick={() => handleApplySuggestion(suggestion)}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                Use This
              </Button>
            </div>
          ))}
        </div>
      )}

      {suggestions.supportingCopySuggestions.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Supporting Copy
          </div>
          {suggestions.supportingCopySuggestions.map((suggestion, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px',
                backgroundColor: '#fafafa',
                borderRadius: '4px',
                marginBottom: '8px',
                border: '1px solid #e8e8e8'
              }}
            >
              <div style={{ color: '#2c2c2c', fontSize: '13px', marginBottom: '8px', lineHeight: '1.5' }}>
                {suggestion}
              </div>
              <Button
                variant="secondary"
                onClick={() => handleApplySuggestion(suggestion)}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                Use This
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
