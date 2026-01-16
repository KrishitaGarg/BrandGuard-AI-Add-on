// Adobe Express Add-on: Autofix Logic Layer
// This module provides autofix suggestions for a single design element based on compliance evaluation results.
// All fixes are explicit instructions only—no changes are applied automatically or to the document.
// This logic is sandbox-safe and must be invoked only by explicit user action on selected elements.

import { BRAND_RULES, evaluateCompliance } from './complianceEngine.js';

/**
 * Utility: Find the nearest approved color (Euclidean distance in RGB)
 */
function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  return [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16));
}

function colorDistance(rgb1, rgb2) {
  return Math.sqrt(
    Math.pow(rgb1[0] - rgb2[0], 2) +
    Math.pow(rgb1[1] - rgb2[1], 2) +
    Math.pow(rgb1[2] - rgb2[2], 2)
  );
}

function findNearestBrandColor(hex) {
  const rgb = hexToRgb(hex);
  let minDist = Infinity, nearest = BRAND_RULES.colors[0];
  for (const brandHex of BRAND_RULES.colors) {
    const dist = colorDistance(rgb, hexToRgb(brandHex));
    if (dist < minDist) {
      minDist = dist;
      nearest = brandHex;
    }
  }
  return nearest;
}

/**
 * Utility: Adjust text color to meet minimum contrast ratio (try black/white fallback)
 * Returns a color that meets contrast, or null if not possible
 */
function adjustTextColorForContrast(textColor, backgroundColor) {
  // Try black and white as fallback
  const contrast = (c1, c2) => {
    // Use the same contrastRatio as complianceEngine
    const l = (h) => {
      let c = h.replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const rgb = [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16) / 255);
      return rgb.map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
        .reduce((a, b, i) => a + b * [0.2126, 0.7152, 0.0722][i], 0);
    };
    const l1 = l(c1), l2 = l(c2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  if (contrast('#000000', backgroundColor) >= BRAND_RULES.minContrastRatio) return '#000000';
  if (contrast('#FFFFFF', backgroundColor) >= BRAND_RULES.minContrastRatio) return '#FFFFFF';
  // If neither black nor white works, return null (manual intervention needed)
  return null;
}

/**
 * Generate autofix instructions for a single element
 * @param {Object} element - Visual properties of the selected element
 * @param {Object} complianceResult - Result from evaluateCompliance(element)
 * @returns {Array<Object>} List of fix instructions
 */
export function generateAutofixInstructions(element, complianceResult) {
  // This function must be called only on user-selected elements, never in batch or automatically
  // No document API access, only generates fix instructions
  const fixes = [];
  for (const v of complianceResult.violations) {
    if (v.rule === 'Text Color') {
      const nearest = findNearestBrandColor(element.textColor);
      fixes.push({
        property: 'textColor',
        current: element.textColor,
        proposed: nearest,
        reason: 'Replace with nearest approved brand color to maintain brand consistency.'
      });
    }
    if (v.rule === 'Font Family') {
      fixes.push({
        property: 'fontFamily',
        current: element.fontFamily,
        proposed: BRAND_RULES.fontFamilies[0],
        reason: 'Replace with approved font family to ensure brand recognition and accessibility.'
      });
    }
    if (v.rule === 'Font Size') {
      fixes.push({
        property: 'fontSize',
        current: element.fontSize,
        proposed: BRAND_RULES.minFontSize,
        reason: 'Increase font size to meet minimum accessibility and readability standards.'
      });
    }
    if (v.rule === 'Font Weight') {
      fixes.push({
        property: 'fontWeight',
        current: element.fontWeight,
        proposed: BRAND_RULES.allowedFontWeights[0],
        reason: 'Replace with approved font weight for consistent brand appearance.'
      });
    }
    if (v.rule === 'Contrast Ratio' && element.backgroundColor) {
      const adjusted = adjustTextColorForContrast(element.textColor, element.backgroundColor);
      if (adjusted) {
        fixes.push({
          property: 'textColor',
          current: element.textColor,
          proposed: adjusted,
          reason: 'Adjust text color to meet minimum contrast ratio for accessibility.'
        });
      } else {
        fixes.push({
          property: 'textColor',
          current: element.textColor,
          proposed: null,
          reason: 'No simple color adjustment can meet contrast requirements; manual review needed.'
        });
      }
    }
  }
  return fixes;
}

/**
 * Example usage (to be removed in production):
 *
 * const element = {
 *   textColor: '#333333',
 *   backgroundColor: '#FFFFFF',
 *   fontFamily: 'Times New Roman',
 *   fontSize: 10,
 *   fontWeight: 300
 * };
 * const compliance = evaluateCompliance(element);
 * const fixes = generateAutofixInstructions(element, compliance);
 */
