/**
 * Fixes Panel Component
 * 
 * NEW component for displaying and managing fix suggestions.
 * Renders dynamically based on API response - NO HARDCODED VALUES.
 */

import React, { useEffect, useState } from 'react';
import { useFixes, Fix } from '../../contexts/FixesContext';
import FixCard from './FixCard';
import './FixesPanel.css';

import type { DocumentSandboxApi } from '../../../models/DocumentSandboxApi';

interface FixesPanelProps {
  designId: string;
  brandId: string;
  industry?: string;
  complianceResults?: any;
  design?: any;
  brandRules?: any;
  onFixApplied?: () => void;
  sandboxProxy?: DocumentSandboxApi;
}

export default function FixesPanel({
  designId,
  brandId,
  industry = 'general',
  complianceResults,
  design,
  brandRules,
  onFixApplied,
  sandboxProxy,
}: FixesPanelProps) {
  const { fixes, loading, error, generateFixes, applyAllFixes } = useFixes();
  const [selectedFixes, setSelectedFixes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (designId && brandId) {
      generateFixes(designId, brandId, industry, complianceResults, design, brandRules);
    }
  }, [designId, brandId, industry]);

  const handleSelectFix = (fixId: string) => {
    setSelectedFixes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fixId)) {
        newSet.delete(fixId);
      } else {
        newSet.add(fixId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const autoFixableFixes = fixes.filter((f) => f.autoFixable && !(f as any).applied);
    if (selectedFixes.size === autoFixableFixes.length) {
      setSelectedFixes(new Set());
    } else {
      setSelectedFixes(new Set(autoFixableFixes.map((f) => f.id)));
    }
  };

  const handleApplySelected = async () => {
    const fixIds = Array.from(selectedFixes);
    if (fixIds.length === 0) return;

    try {
      // This will be handled by the parent component via onFixApplied
      // The actual command execution happens in the parent via adobeExpressIntegration
      await applyAllFixes(fixIds, designId, design);
      setSelectedFixes(new Set());
      onFixApplied?.();
    } catch (error) {
      console.error('Error applying fixes:', error);
    }
  };

  if (loading) {
    return (
      <div className="fixes-panel">
        <div className="fixes-panel-loading">Generating fix suggestions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixes-panel">
        <div className="fixes-panel-error">Error: {error}</div>
      </div>
    );
  }

  if (fixes.length === 0) {
    return (
      <div className="fixes-panel">
        <div className="fixes-panel-empty">No fix suggestions available.</div>
      </div>
    );
  }

  // Group fixes by severity (from API response, not hardcoded)
  const criticalFixes = fixes.filter((f) => f.severity === 'critical' && !(f as any).applied);
  const warningFixes = fixes.filter((f) => f.severity === 'warning' && !(f as any).applied);
  const infoFixes = fixes.filter((f) => f.severity === 'info' && !(f as any).applied);
  const appliedFixes = fixes.filter((f) => (f as any).applied);

  const autoFixableCount = fixes.filter((f) => f.autoFixable && !(f as any).applied).length;

  return (
    <div className="fixes-panel">
      <div className="fixes-panel-header">
        <h3>Suggested Fixes</h3>
        {autoFixableCount > 0 && (
          <div className="fixes-panel-actions">
            <button onClick={handleSelectAll} className="fixes-select-all-btn">
              {selectedFixes.size === autoFixableCount ? 'Deselect All' : 'Select All'}
            </button>
            {selectedFixes.size > 0 && (
              <button onClick={handleApplySelected} className="fixes-apply-selected-btn">
                Apply Selected ({selectedFixes.size})
              </button>
            )}
          </div>
        )}
      </div>

      {criticalFixes.length > 0 && (
        <div className="fixes-section">
          <h4 className="fixes-section-title critical">Critical Issues ({criticalFixes.length})</h4>
          {criticalFixes.map((fix) => (
            <FixCard
              key={fix.id}
              fix={fix}
              selected={selectedFixes.has(fix.id)}
              onSelect={() => handleSelectFix(fix.id)}
              designId={designId}
              onFixApplied={onFixApplied}
              sandboxProxy={sandboxProxy}
            />
          ))}
        </div>
      )}

      {warningFixes.length > 0 && (
        <div className="fixes-section">
          <h4 className="fixes-section-title warning">Warnings ({warningFixes.length})</h4>
          {warningFixes.map((fix) => (
            <FixCard
              key={fix.id}
              fix={fix}
              selected={selectedFixes.has(fix.id)}
              onSelect={() => handleSelectFix(fix.id)}
              designId={designId}
              onFixApplied={onFixApplied}
              sandboxProxy={sandboxProxy}
            />
          ))}
        </div>
      )}

      {infoFixes.length > 0 && (
        <div className="fixes-section">
          <h4 className="fixes-section-title info">Suggestions ({infoFixes.length})</h4>
          {infoFixes.map((fix) => (
            <FixCard
              key={fix.id}
              fix={fix}
              selected={selectedFixes.has(fix.id)}
              onSelect={() => handleSelectFix(fix.id)}
              designId={designId}
              onFixApplied={onFixApplied}
              sandboxProxy={sandboxProxy}
            />
          ))}
        </div>
      )}

      {appliedFixes.length > 0 && (
        <div className="fixes-section">
          <h4 className="fixes-section-title applied">Applied Fixes ({appliedFixes.length})</h4>
          {appliedFixes.map((fix) => (
            <FixCard
              key={fix.id}
              fix={fix}
              selected={false}
              onSelect={() => {}}
              designId={designId}
              onFixApplied={onFixApplied}
              applied
            />
          ))}
        </div>
      )}
    </div>
  );
}
