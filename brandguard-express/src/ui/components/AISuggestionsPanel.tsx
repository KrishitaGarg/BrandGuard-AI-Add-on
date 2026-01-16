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

interface CollapsibleSectionsState {
  headlineSuggestions: boolean;
  bodyCopySuggestions: boolean;
  ctaSuggestions: boolean;
  supportingCopySuggestions: boolean;
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
  const [expandedSections, setExpandedSections] = useState<CollapsibleSectionsState>({
    headlineSuggestions: false,
    bodyCopySuggestions: false,
    ctaSuggestions: false,
    supportingCopySuggestions: false,
  });

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

  const toggleSection = (section: keyof CollapsibleSectionsState) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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
    } catch (error) {
      console.error('Error applying suggestion:', error);
    }
  };

  const CollapsibleSectionHeader = ({
    title,
    count,
    isExpanded,
    onToggle,
  }: {
    title: string;
    count: number;
    isExpanded: boolean;
    onToggle: () => void;
  }) => (
    <button
      onClick={onToggle}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'transparent',
        border: 'none',
        padding: '8px 0',
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: 500,
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        transition: 'all 0.2s ease',
        marginBottom: '8px',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '16px',
          height: '16px',
          marginRight: '6px',
          transition: 'transform 0.2s ease',
          transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          fontSize: '12px',
        }}
      >
        ▼
      </span>
      {title} ({count})
    </button>
  );

  const SuggestionCard = ({ suggestion }: { suggestion: string }) => (
    <div
      style={{
        padding: '12px',
        backgroundColor: '#fafafa',
        borderRadius: '4px',
        marginBottom: '8px',
        border: '1px solid #e8e8e8',
        transition: 'all 0.2s ease',
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
  );

  const CollapsibleSection = ({
    title,
    suggestions: sectionSuggestions,
    sectionKey,
  }: {
    title: string;
    suggestions: string[];
    sectionKey: keyof CollapsibleSectionsState;
  }) => {
    const isExpanded = expandedSections[sectionKey];

    if (sectionSuggestions.length === 0) return null;

    return (
      <div style={{ marginBottom: '20px' }}>
        <CollapsibleSectionHeader
          title={title}
          count={sectionSuggestions.length}
          isExpanded={isExpanded}
          onToggle={() => toggleSection(sectionKey)}
        />
        <div
          style={{
            maxHeight: isExpanded ? '1000px' : '0px',
            overflow: 'hidden',
            transition: 'max-height 0.3s ease',
          }}
        >
          {sectionSuggestions.map((suggestion, idx) => (
            <SuggestionCard key={idx} suggestion={suggestion} />
          ))}
        </div>
      </div>
    );
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

      <CollapsibleSection
        title="Headline Options"
        suggestions={suggestions.headlineSuggestions}
        sectionKey="headlineSuggestions"
      />

      <CollapsibleSection
        title="Body Copy"
        suggestions={suggestions.bodyCopySuggestions}
        sectionKey="bodyCopySuggestions"
      />

      <CollapsibleSection
        title="Call-to-Action Options"
        suggestions={suggestions.ctaSuggestions}
        sectionKey="ctaSuggestions"
      />

      <CollapsibleSection
        title="Supporting Copy"
        suggestions={suggestions.supportingCopySuggestions}
        sectionKey="supportingCopySuggestions"
      />
    </div>
  );
}
