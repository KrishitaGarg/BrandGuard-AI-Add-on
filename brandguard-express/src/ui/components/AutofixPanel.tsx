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
}

export default function AutofixPanel({
  textComplianceResults,
  brandProfile,
  sandboxProxy,
  onFixApplied,
}: AutofixPanelProps) {
  const [textIssues, setTextIssues] = useState<TextIssue[]>([]);
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null);

  // Convert compliance results to text issues
  React.useEffect(() => {
    const issues: TextIssue[] = [];
    
    // Map text compliance results to text issues
    if (textComplianceResults && textComplianceResults.length > 0) {
      textComplianceResults.forEach((result: any) => {
        // Only include results with issues
        if (result.issues && result.issues.length > 0 && result.score < 100) {
          issues.push({
            layerId: result.layerId || `layer-${issues.length}`,
            originalText: result.originalText || '',
            issues: result.issues || [],
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

  if (textIssues.length === 0) {
    return (
      <div style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
        No text compliance issues found.
      </div>
    );
  }

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Autofix Suggestions</h4>
        {textIssues.length > 0 && (
          <Button
            variant="secondary"
            onClick={handleApplyAll}
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            Apply All ({textIssues.length})
          </Button>
        )}
      </div>

      {textIssues.map((issue) => (
        <div
          key={issue.layerId}
          style={{
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '8px',
            backgroundColor: '#fafafa',
          }}
        >
          <div style={{ marginBottom: '8px' }}>
            <strong style={{ fontSize: '12px' }}>Issues:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: '20px', fontSize: '11px' }}>
              {issue.issues.map((iss: any, idx: number) => (
                <li key={idx}>{iss.explanation || iss.type}</li>
              ))}
            </ul>
          </div>

          {expandedLayer === issue.layerId && issue.diff && (
            <div
              style={{
                padding: '8px',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginBottom: '8px',
                fontSize: '11px',
              }}
            >
              <div style={{ marginBottom: '4px' }}>
                <strong>Before:</strong>
                <div style={{ color: '#d32f2f', textDecoration: 'line-through' }}>
                  {issue.originalText}
                </div>
              </div>
              <div>
                <strong>After:</strong>
                <div style={{ color: '#2e7d32' }}>{issue.fixedText}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            {!issue.fixedText && (
              <Button
                variant="secondary"
                onClick={() => handlePreviewFix(issue)}
                style={{ fontSize: '11px', padding: '4px 8px' }}
              >
                Preview Fix
              </Button>
            )}
            {issue.fixedText && (
              <Button
                variant="primary"
                onClick={() => handleApplyFix(issue)}
                disabled={issue.applying}
                style={{ fontSize: '11px', padding: '4px 8px' }}
              >
                {issue.applying ? 'Applying...' : 'Apply Fix'}
              </Button>
            )}
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
