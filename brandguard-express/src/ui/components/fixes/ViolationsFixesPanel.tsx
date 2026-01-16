/**
 * Violations Fixes Panel
 * 
 * Displays violations from backend /analyze response with fixAction.
 * Applies fixes directly using Adobe Express SDK.
 */

import React, { useState } from 'react';
import { applyFixAction } from '../../../services/fixApplicator';
import type { DocumentSandboxApi } from '../../../models/DocumentSandboxApi';
import FixCard from './FixCard';
import './FixesPanel.css';

interface Violation {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  currentValue: string;
  recommendedValue: string;
  reasoning: string;
  autoFixable: boolean;
  elementId: string;
  fixAction: any; // Backend-provided fix action
  metadata?: any;
}

interface ViolationsFixesPanelProps {
  violations: Violation[];
  onFixApplied?: () => void;
  sandboxProxy?: DocumentSandboxApi;
}

export default function ViolationsFixesPanel({
  violations,
  onFixApplied,
  sandboxProxy,
}: ViolationsFixesPanelProps) {
  const [appliedFixIds, setAppliedFixIds] = useState<Set<string>>(new Set());
  const [applyingFix, setApplyingFix] = useState<string | null>(null);

  const handleApplyFix = async (violation: Violation) => {
    if (!sandboxProxy || !violation.fixAction) {
      return;
    }

    setApplyingFix(violation.id);
    try {
      await applyFixAction(violation.fixAction, sandboxProxy);
      setAppliedFixIds((prev) => new Set(prev).add(violation.id));
      onFixApplied?.();
    } catch (error) {
      console.error('Error applying fix:', error);
    } finally {
      setApplyingFix(null);
    }
  };

  const handleApplyAll = async () => {
    const autoFixable = violations.filter((v) => v.autoFixable && !appliedFixIds.has(v.id));
    
    for (const violation of autoFixable) {
      if (sandboxProxy && violation.fixAction) {
        try {
          await applyFixAction(violation.fixAction, sandboxProxy);
          setAppliedFixIds((prev) => new Set(prev).add(violation.id));
        } catch (error) {
          console.error(`Error applying fix ${violation.id}:`, error);
        }
      }
    }
    
    onFixApplied?.();
  };

  // Group violations by severity
  const critical = violations.filter((v) => 
    (v.severity === 'critical' || v.severity === 'high') && !appliedFixIds.has(v.id)
  );
  const warnings = violations.filter((v) => 
    (v.severity === 'warning' || v.severity === 'medium') && !appliedFixIds.has(v.id)
  );
  const info = violations.filter((v) => 
    (v.severity === 'low' || v.severity === 'info') && !appliedFixIds.has(v.id)
  );
  const applied = violations.filter((v) => appliedFixIds.has(v.id));

  const autoFixableCount = violations.filter((v) => v.autoFixable && !appliedFixIds.has(v.id)).length;

  return (
    <div className="fixes-panel">
      <div className="fixes-panel-header">
        <h3>Suggested Fixes</h3>
        {autoFixableCount > 0 && (
          <button onClick={handleApplyAll} className="fixes-apply-selected-btn">
            Fix All Auto-Fixable ({autoFixableCount})
          </button>
        )}
      </div>

      {critical.length > 0 && (
        <div className="fixes-section">
          <h4 className="fixes-section-title critical">Critical Issues ({critical.length})</h4>
          {critical.map((violation) => (
            <ViolationCard
              key={violation.id}
              violation={violation}
              onApply={() => handleApplyFix(violation)}
              applying={applyingFix === violation.id}
              applied={false}
              sandboxProxy={sandboxProxy}
            />
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="fixes-section">
          <h4 className="fixes-section-title warning">Warnings ({warnings.length})</h4>
          {warnings.map((violation) => (
            <ViolationCard
              key={violation.id}
              violation={violation}
              onApply={() => handleApplyFix(violation)}
              applying={applyingFix === violation.id}
              applied={false}
              sandboxProxy={sandboxProxy}
            />
          ))}
        </div>
      )}

      {info.length > 0 && (
        <div className="fixes-section">
          <h4 className="fixes-section-title info">Suggestions ({info.length})</h4>
          {info.map((violation) => (
            <ViolationCard
              key={violation.id}
              violation={violation}
              onApply={() => handleApplyFix(violation)}
              applying={applyingFix === violation.id}
              applied={false}
              sandboxProxy={sandboxProxy}
            />
          ))}
        </div>
      )}

      {applied.length > 0 && (
        <div className="fixes-section">
          <h4 className="fixes-section-title applied">Applied Fixes ({applied.length})</h4>
          {applied.map((violation) => (
            <ViolationCard
              key={violation.id}
              violation={violation}
              onApply={() => {}}
              applying={false}
              applied={true}
              sandboxProxy={sandboxProxy}
            />
          ))}
        </div>
      )}

      {violations.length === 0 && (
        <div className="fixes-panel-empty">No fix suggestions available.</div>
      )}
    </div>
  );
}

function ViolationCard({
  violation,
  onApply,
  applying,
  applied,
  sandboxProxy,
}: {
  violation: Violation;
  onApply: () => void;
  applying: boolean;
  applied: boolean;
  sandboxProxy?: DocumentSandboxApi;
}) {
  const severityClass = `fix-card-severity-${violation.severity}`;
  const typeIcon = getTypeIcon(violation.type);

  return (
    <div className={`fix-card ${severityClass} ${applied ? 'fix-card-applied' : ''}`}>
      <div className="fix-card-header">
        <div className="fix-card-title-row">
          <span className="fix-card-type-icon">{typeIcon}</span>
          <h5 className="fix-card-title">{violation.title}</h5>
          {applied && <span className="fix-card-applied-badge">Applied</span>}
        </div>
        <span className={`fix-card-severity-badge ${severityClass}`}>
          {violation.severity}
        </span>
      </div>

      <div className="fix-card-body">
        <p className="fix-card-description">{violation.description}</p>

        <div className="fix-card-values">
          <div className="fix-card-value">
            <span className="fix-card-value-label">Current:</span>
            <span className="fix-card-value-content">{violation.currentValue || 'N/A'}</span>
          </div>
          <div className="fix-card-value">
            <span className="fix-card-value-label">Recommended:</span>
            <span className="fix-card-value-content fix-card-recommended">
              {violation.recommendedValue}
            </span>
          </div>
        </div>

        {violation.reasoning && (
          <div className="fix-card-reasoning">
            <strong>Why:</strong> {violation.reasoning}
          </div>
        )}
      </div>

      <div className="fix-card-actions">
        {violation.autoFixable && !applied && sandboxProxy && (
          <button
            onClick={onApply}
            className="fix-card-btn fix-card-apply-btn"
            disabled={applying}
          >
            {applying ? 'Applying...' : 'Apply Fix'}
          </button>
        )}
        {!violation.autoFixable && (
          <span className="fix-card-manual-review">Requires manual review</span>
        )}
      </div>
    </div>
  );
}

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    brand_colors: '🎨',
    color: '🎨',
    brand_typography: '🔤',
    font: '🔤',
    logo_size: '🖼️',
    forbidden_phrase: '📝',
    replace_text: '📝',
    content: '📝',
    generic: '⚙️',
  };
  return icons[type] || '⚙️';
}
