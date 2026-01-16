/**
 * Autofix Panel Component
 * 
 * Displays text compliance issues with autofix options.
 * Builds on existing analysis results.
 */

import React, { useState } from 'react';
import { Button } from '@swc-react/button';
import type { DocumentSandboxApi } from '../../models/DocumentSandboxApi';
import { applyAutofix } from '../../services/autofixService';
import type { BrandProfile } from '../../brandProfile';

interface AutofixPanelProps {
  textComplianceResults: any[];
  brandProfile: BrandProfile;
  sandboxProxy: DocumentSandboxApi;
  onFixApplied: () => Promise<void>;
}

interface TextIssue {
  layerId: string;
  originalText: string;
  issues: any[];
  fixedText?: string;
  diff?: string;
  applying?: boolean;
  sentenceSuggestions?: Array<{
    original: string;
    suggested: string;
    explanation: string;
  }>;
}

export default function AutofixPanel({
  textComplianceResults,
  brandProfile,
  sandboxProxy,
  onFixApplied,
}: AutofixPanelProps) {
  const [textIssues, setTextIssues] = useState<TextIssue[]>([]);
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null);
  // Undo state: map of layerId -> originalText for last applied fixes
  const [undoData, setUndoData] = useState<Record<string, string>>({});

  // Convert compliance results to text issues
  React.useEffect(() => {
    const issues: TextIssue[] = [];
    
    // Map text compliance results to text issues
    if (textComplianceResults && textComplianceResults.length > 0) {
      textComplianceResults.forEach((result: any) => {
        // Only include results with issues
        if (result.issues && result.issues.length > 0 && result.score < 100) {
          // Extract sentence-level suggestions from rewriteSuggestions
          const sentenceSuggestions: Array<{
            original: string;
            suggested: string;
            explanation: string;
          }> = [];
          
          for (const issue of result.issues || []) {
            if (issue.rewriteSuggestions && Array.isArray(issue.rewriteSuggestions)) {
              for (const suggestion of issue.rewriteSuggestions) {
                // Include sentence-level suggestions (have 'text' property, not just word replacements)
                if (suggestion.text && suggestion.text !== result.originalText) {
                  sentenceSuggestions.push({
                    original: result.originalText,
                    suggested: suggestion.text,
                    explanation: issue.explanation || issue.type || 'Sentence improvement',
                  });
                  break; // One sentence suggestion per issue
                }
              }
            }
          }
          
          issues.push({
            layerId: result.layerId || `layer-${issues.length}`,
            originalText: result.originalText || '',
            issues: result.issues || [],
            sentenceSuggestions: sentenceSuggestions.length > 0 ? sentenceSuggestions : undefined,
          });
        }
      });
    }

    setTextIssues(issues);
  }, [textComplianceResults]);

  const handlePreviewFix = async (issue: TextIssue) => {
    const brandGuidelines = {
      preferredTerms: buildPreferredTermsMap(brandProfile.preferredTerms || []),
      disallowedTerms: brandProfile.disallowedPhrases || [],
      toneRules: [brandProfile.tonePreference],
    };

    const autofixResult = await applyAutofix({
      text: issue.originalText,
      issues: issue.issues,
      brandGuidelines,
    });

    if (autofixResult.success && autofixResult.changed) {
      setTextIssues((prev) =>
        prev.map((i) =>
          i.layerId === issue.layerId
            ? { ...i, fixedText: autofixResult.fixedText, diff: generateDiff(issue.originalText, autofixResult.fixedText) }
            : i
        )
      );
      setExpandedLayer(issue.layerId);
    }
  };

  const handleApplyFix = async (issue: TextIssue) => {
    if (!issue.fixedText) {
      // Preview first if not already done
      await handlePreviewFix(issue);
      return;
    }

    setTextIssues((prev) =>
      prev.map((i) =>
        i.layerId === issue.layerId ? { ...i, applying: true } : i
      )
    );

    try {
      // Capture original text for undo before applying fix
      setUndoData((prev) => ({
        ...prev,
        [issue.layerId]: issue.originalText,
      }));

      // Apply fix to canvas - pass originalText for reliable layer matching
      await sandboxProxy.applyTextFix({
        layerId: issue.layerId,
        fixedText: issue.fixedText,
        originalText: issue.originalText,
      });

      // Re-analyze to update score
      await onFixApplied();

      // Remove from issues list (fix applied)
      setTextIssues((prev) => prev.filter((i) => i.layerId !== issue.layerId));
    } catch (error) {
      console.error('Error applying fix:', error);
      // Remove undo data if apply failed
      setUndoData((prev) => {
        const updated = { ...prev };
        delete updated[issue.layerId];
        return updated;
      });
    } finally {
      setTextIssues((prev) =>
        prev.map((i) =>
          i.layerId === issue.layerId ? { ...i, applying: false } : i
        )
      );
    }
  };

  const handleApplyAll = async () => {
    for (const issue of textIssues) {
      if (!issue.fixedText) {
        await handlePreviewFix(issue);
        // Wait a bit for state update
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await handleApplyFix(issue);
    }
  };

  const handleApplySentenceSuggestion = async (issue: TextIssue, suggestedText: string) => {
    setTextIssues((prev) =>
      prev.map((i) =>
        i.layerId === issue.layerId ? { ...i, applying: true } : i
      )
    );

    try {
      // Capture original text for undo before applying
      setUndoData((prev) => ({
        ...prev,
        [issue.layerId]: issue.originalText,
      }));

      // Apply sentence suggestion to canvas
      await sandboxProxy.applyTextFix({
        layerId: issue.layerId,
        fixedText: suggestedText,
        originalText: issue.originalText,
      });

      // Re-analyze to update score
      await onFixApplied();

      // Remove from issues list (fix applied)
      setTextIssues((prev) => prev.filter((i) => i.layerId !== issue.layerId));
    } catch (error) {
      console.error('Error applying sentence suggestion:', error);
      setUndoData((prev) => {
        const updated = { ...prev };
        delete updated[issue.layerId];
        return updated;
      });
    } finally {
      setTextIssues((prev) =>
        prev.map((i) =>
          i.layerId === issue.layerId ? { ...i, applying: false } : i
        )
      );
    }
  };

  const handleUndoAutofix = async () => {
    const undoEntries = Object.entries(undoData);
    if (undoEntries.length === 0) return;

    try {
      // Restore each layer to its original text
      for (const [layerId, originalText] of undoEntries) {
        await sandboxProxy.applyTextFix({
          layerId,
          fixedText: originalText,
          originalText: originalText,
        });
      }

      // Clear undo data after restore
      setUndoData({});

      // Re-analyze to update score
      await onFixApplied();
    } catch (error) {
      console.error('Error undoing autofix:', error);
    }
  };

  if (textIssues.length === 0) {
    return (
      <div style={{ padding: '20px 16px', fontSize: '13px', color: '#888', textAlign: 'center' }}>
        No text compliance issues found.
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
          Autofix Suggestions
        </h4>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {Object.keys(undoData).length > 0 && (
            <Button
              variant="secondary"
              onClick={handleUndoAutofix}
              style={{ fontSize: '12px', padding: '5px 11px' }}
            >
              Undo Autofix
            </Button>
          )}
          {textIssues.length > 0 && (
            <Button
              variant="secondary"
              onClick={handleApplyAll}
              style={{ fontSize: '12px', padding: '5px 11px' }}
            >
              Apply All ({textIssues.length})
            </Button>
          )}
        </div>
      </div>

      {textIssues.map((issue, index) => (
        <div key={issue.layerId}>
          {index > 0 && (
            <div style={{ height: '1px', backgroundColor: '#e0e0e0', margin: '0 0 16px 0' }} />
          )}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Issues
              </div>
              <ul style={{ 
                margin: 0, 
                paddingLeft: '20px', 
                fontSize: '13px',
                color: '#2c2c2c',
                lineHeight: '1.6',
                listStyleType: 'disc'
              }}>
                {issue.issues.map((iss: any, idx: number) => (
                  <li key={idx} style={{ marginBottom: '6px' }}>
                    {iss.explanation || iss.type}
                  </li>
                ))}
              </ul>
            </div>

            {expandedLayer === issue.layerId && issue.diff && (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: '#fafafa',
                  borderRadius: '4px',
                  marginBottom: '14px',
                  fontSize: '12px',
                  lineHeight: '1.65',
                  border: '1px solid #e8e8e8'
                }}
              >
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: '#888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Before
                  </div>
                  <div style={{ color: '#666', fontFamily: 'monospace', fontSize: '12px' }}>
                    {issue.originalText}
                  </div>
                </div>
                <div style={{ paddingTop: '10px', borderTop: '1px solid #e8e8e8' }}>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: '#888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    After
                  </div>
                  <div style={{ color: '#2c2c2c', fontFamily: 'monospace', fontSize: '12px' }}>
                    {issue.fixedText}
                  </div>
                </div>
              </div>
            )}

            {issue.sentenceSuggestions && issue.sentenceSuggestions.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 500, color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Sentence Suggestions
                </div>
                {issue.sentenceSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px',
                      backgroundColor: '#fafafa',
                      borderRadius: '4px',
                      marginBottom: '10px',
                      border: '1px solid #e8e8e8'
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                      {suggestion.explanation}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 500, color: '#888', marginBottom: '4px' }}>
                        Suggested
                      </div>
                      <div style={{ color: '#2c2c2c', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.5' }}>
                        {suggestion.suggested}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => handleApplySentenceSuggestion(issue, suggestion.suggested)}
                      disabled={issue.applying}
                      style={{ fontSize: '12px', padding: '5px 11px' }}
                    >
                      {issue.applying ? 'Applying...' : 'Apply Suggestion'}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {!issue.fixedText && (
                <Button
                  variant="secondary"
                  onClick={() => handlePreviewFix(issue)}
                  style={{ fontSize: '12px', padding: '5px 11px' }}
                >
                  Preview Fix
                </Button>
              )}
              {issue.fixedText && (
                <Button
                  variant="primary"
                  onClick={() => handleApplyFix(issue)}
                  disabled={issue.applying}
                  style={{ fontSize: '12px', padding: '5px 11px' }}
                >
                  {issue.applying ? 'Applying...' : 'Apply Fix'}
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Build preferred terms map from array
 */
function buildPreferredTermsMap(preferredTerms: string[]): Record<string, string> {
  // This is a simple mapping - in real implementation, you'd have pairs
  // For now, return empty map (fixes will use issues' rewriteSuggestions)
  return {};
}

/**
 * Generate simple diff for display
 */
function generateDiff(before: string, after: string): string {
  // Simple diff - just show before/after
  return `Changed: "${before}" → "${after}"`;
}
