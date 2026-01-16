/**
 * Fix Card Component
 * 
 * Displays individual fix suggestion with all data from API (dynamic, not hardcoded).
 */

import React, { useState } from 'react';
import { useFixes, Fix } from '../../contexts/FixesContext';
import { executeFixCommands } from '../../../services/adobeExpressIntegration';
import type { DocumentSandboxApi } from '../../../models/DocumentSandboxApi';
import './FixCard.css';

interface FixCardProps {
  fix: Fix;
  selected: boolean;
  onSelect: () => void;
  designId: string;
  onFixApplied?: () => void;
  applied?: boolean;
  sandboxProxy?: DocumentSandboxApi;
}

export default function FixCard({
  fix,
  selected,
  onSelect,
  designId,
  onFixApplied,
  applied = false,
  sandboxProxy,
}: FixCardProps) {
  const { applyFix, applyingFix, getFixPreview } = useFixes();
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const handleApply = async () => {
    if (!sandboxProxy) {
      console.error('Sandbox proxy not available');
      return;
    }

    try {
      // Get commands from backend
      const commands = await applyFix(fix.id, designId);

      if (commands && commands.length > 0) {
        // Execute commands on Adobe Express canvas
        await executeFixCommands(commands, sandboxProxy);
        onFixApplied?.();
      }
    } catch (error) {
      console.error('Error applying fix:', error);
    }
  };

  const handlePreview = async () => {
    if (showPreview && previewData) {
      setShowPreview(false);
      return;
    }

    const preview = await getFixPreview(fix.id, designId);
    if (preview) {
      setPreviewData(preview);
      setShowPreview(true);
    }
  };

  const severityClass = `fix-card-severity-${fix.severity}`;
  const typeIcon = getTypeIcon(fix.type);

  return (
    <div className={`fix-card ${severityClass} ${applied ? 'fix-card-applied' : ''}`}>
      <div className="fix-card-header">
        <div className="fix-card-title-row">
          {fix.autoFixable && !applied && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onSelect}
              className="fix-card-checkbox"
            />
          )}
          <span className="fix-card-type-icon">{typeIcon}</span>
          <h5 className="fix-card-title">{fix.title}</h5>
          {applied && <span className="fix-card-applied-badge">Applied</span>}
        </div>
        <span className={`fix-card-severity-badge ${severityClass}`}>
          {fix.severity}
        </span>
      </div>

      <div className="fix-card-body">
        <p className="fix-card-description">{fix.description}</p>

        <div className="fix-card-values">
          <div className="fix-card-value">
            <span className="fix-card-value-label">Current:</span>
            <span className="fix-card-value-content">{fix.currentValue || 'N/A'}</span>
          </div>
          <div className="fix-card-value">
            <span className="fix-card-value-label">Recommended:</span>
            <span className="fix-card-value-content fix-card-recommended">
              {fix.recommendedValue} {/* From database */}
            </span>
          </div>
        </div>

        {fix.reasoning && (
          <div className="fix-card-reasoning">
            <strong>Why:</strong> {fix.reasoning}
          </div>
        )}

        {fix.metadata && (
          <div className="fix-card-metadata">
            {fix.metadata.guidelineSource && (
              <div className="fix-card-metadata-item">
                <strong>Source:</strong> {fix.metadata.guidelineSource}
              </div>
            )}
            {fix.metadata.industryStandard && (
              <div className="fix-card-metadata-item">
                <strong>Standard:</strong> {fix.metadata.industryStandard}
              </div>
            )}
          </div>
        )}

        {showPreview && previewData && (
          <div className="fix-card-preview">
            <div className="fix-card-preview-item">
              <strong>Before:</strong> {previewData.changes?.before || fix.currentValue}
            </div>
            <div className="fix-card-preview-item">
              <strong>After:</strong> {previewData.changes?.after || fix.recommendedValue}
            </div>
          </div>
        )}
      </div>

      <div className="fix-card-actions">
        <button
          onClick={handlePreview}
          className="fix-card-btn fix-card-preview-btn"
          disabled={applied}
        >
          {showPreview ? 'Hide Preview' : 'Preview'}
        </button>
        {fix.autoFixable && !applied && sandboxProxy && (
          <button
            onClick={handleApply}
            className="fix-card-btn fix-card-apply-btn"
            disabled={applyingFix === fix.id}
          >
            {applyingFix === fix.id ? 'Applying...' : 'Apply Fix'}
          </button>
        )}
        {!fix.autoFixable && (
          <span className="fix-card-manual-review">Requires manual review</span>
        )}
      </div>
    </div>
  );
}

/**
 * Get icon/emoji for fix type (for visual display)
 */
function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    color: '🎨',
    typography: '🔤',
    font_size: '📏',
    logo_size: '🖼️',
    contrast: '🔍',
    spacing: '📐',
    content: '📝',
    generic: '⚙️',
  };
  return icons[type] || '⚙️';
}
