// Adobe Express Add-on: Design Compliance Engine
// This module contains only the compliance logic. It is sandbox-safe and does not access document APIs directly.
// All operations are designed to be invoked by explicit user action, and only on user-selected elements.
// No background execution, no full-document traversal, no network calls, no AI.

/**
 * Static brand design rules (Phase 1, not user-editable)
 */
export const BRAND_RULES = {
  colors: [
    '#1A1A1A', // Black
    '#FFFFFF', // White
    '#0057B8', // Brand Blue
    '#FFD100', // Brand Yellow
    // Add more approved colors as needed
  ],
  fontFamilies: [
    'Inter',
    'Arial',
    'Helvetica Neue',
    'sans-serif',
  ],
  minFontSize: 12, // px
  allowedFontWeights: [400, 500, 700],
  minContrastRatio: 4.5, // WCAG AA for normal text
};

/**
 * Compliance rule weights (must sum to 100)
 */
const RULE_WEIGHTS = {
  color: 40,
  fontFamily: 25,
  typography: 20, // font size + weight
  contrast: 15,
};

/**
 * Utility: Calculate contrast ratio between two colors (hex strings)
 * WCAG formula: https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 */
function luminance(hex) {
  // Convert hex to RGB
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const rgb = [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16) / 255);
  // Gamma correction
  return rgb.map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
    .reduce((a, b, i) => a + b * [0.2126, 0.7152, 0.0722][i], 0);
}

function contrastRatio(hex1, hex2) {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * Compliance evaluation for a single element
 * @param {Object} element - Visual properties of the selected element
 * @param {string} element.textColor - Hex color string
 * @param {string} element.backgroundColor - Hex color string (optional)
 * @param {string} element.fontFamily
 * @param {number} element.fontSize - px
 * @param {number} element.fontWeight
 * @returns {Object} Compliance result
 */
export function evaluateCompliance(element) {
  // All checks are deterministic and non-AI
  const violations = [];
  let colorPass = false, fontPass = false, typoPass = false, contrastPass = false;

  // TEMP: Log element type and extracted properties
  const extractedProps = {
    textColor: element.textColor,
    backgroundColor: element.backgroundColor,
    fontFamily: element.fontFamily,
    fontSize: element.fontSize,
    fontWeight: element.fontWeight
  };
  console.log("ELEMENT_TYPE", element.type);
  console.log("EXTRACTED_PROPS", extractedProps);

  let colorPass = false, fontPass = false, typoPass = false, contrastPass = false;
  const violations = [];
  let notEvaluated = false;

  // Strict rule coverage by element type
  if (element.type === 'shape') {
    // Validate color compliance for shapes
    if (typeof element.textColor === 'string') {
      if (!BRAND_RULES.colors.includes(element.textColor)) {
        violations.push({
          rule: 'Shape Color',
          current: element.textColor,
          expected: `One of: ${BRAND_RULES.colors.join(', ')}`,
          severity: 'critical',
          explanation: 'Shape color is not in the approved brand palette. Using unapproved colors can dilute brand identity and reduce visual consistency.'
        });
      } else {
        colorPass = true;
      }
    } else {
      violations.push({
        rule: 'Shape Color',
        current: element.textColor,
        expected: `One of: ${BRAND_RULES.colors.join(', ')}`,
        severity: 'warning',
        explanation: 'Shape color property is missing or unsupported. Unable to validate color compliance.'
      });
    }
  } else if (element.type === 'text') {
    // Validate all text rules
    // 1. Text color
    if (typeof element.textColor === 'string') {
      if (!BRAND_RULES.colors.includes(element.textColor)) {
        violations.push({
          rule: 'Text Color',
          current: element.textColor,
          expected: `One of: ${BRAND_RULES.colors.join(', ')}`,
          severity: 'critical',
          explanation: 'Text color is not in the approved brand palette. Using unapproved colors can dilute brand identity and reduce visual consistency.'
        });
      } else {
        colorPass = true;
      }
    } else {
      violations.push({
        rule: 'Text Color',
        current: element.textColor,
        expected: `One of: ${BRAND_RULES.colors.join(', ')}`,
        severity: 'warning',
        explanation: 'Text color property is missing or unsupported. Unable to validate color compliance.'
      });
    }
    // 2. Font family
    if (typeof element.fontFamily === 'string') {
      if (!BRAND_RULES.fontFamilies.includes(element.fontFamily)) {
        violations.push({
          rule: 'Font Family',
          current: element.fontFamily,
          expected: `One of: ${BRAND_RULES.fontFamilies.join(', ')}`,
          severity: 'critical',
          explanation: 'Font family is not approved. Using non-brand fonts can undermine brand recognition and accessibility.'
        });
      } else {
        fontPass = true;
      }
    } else {
      violations.push({
        rule: 'Font Family',
        current: element.fontFamily,
        expected: `One of: ${BRAND_RULES.fontFamilies.join(', ')}`,
        severity: 'warning',
        explanation: 'Font family property is missing or unsupported. Unable to validate font compliance.'
      });
    }
    // 3. Font size
    if (typeof element.fontSize === 'number') {
      if (element.fontSize < BRAND_RULES.minFontSize) {
        violations.push({
          rule: 'Font Size',
          current: `${element.fontSize}px`,
          expected: `>= ${BRAND_RULES.minFontSize}px`,
          severity: 'warning',
          explanation: 'Font size is below the minimum allowed. Small text can be hard to read and fails accessibility standards.'
        });
      } else {
        typoPass = true;
      }
    } else {
      violations.push({
        rule: 'Font Size',
        current: element.fontSize,
        expected: `>= ${BRAND_RULES.minFontSize}px`,
        severity: 'warning',
        explanation: 'Font size property is missing or unsupported. Unable to validate font size.'
      });
    }
    // 4. Font weight
    if (typeof element.fontWeight === 'number') {
      if (!BRAND_RULES.allowedFontWeights.includes(element.fontWeight)) {
        violations.push({
          rule: 'Font Weight',
          current: element.fontWeight,
          expected: `One of: ${BRAND_RULES.allowedFontWeights.join(', ')}`,
          severity: 'warning',
          explanation: 'Font weight is not approved. Inconsistent font weights can reduce readability and brand consistency.'
        });
      } else {
        typoPass = typoPass && true;
      }
    } else {
      violations.push({
        rule: 'Font Weight',
        current: element.fontWeight,
        expected: `One of: ${BRAND_RULES.allowedFontWeights.join(', ')}`,
        severity: 'warning',
        explanation: 'Font weight property is missing or unsupported. Unable to validate font weight.'
      });
    }
  } else {
    // Unsupported element type
    notEvaluated = true;
    violations.push({
      rule: 'Element Type',
      current: element.type,
      expected: 'text or shape',
      severity: 'warning',
      explanation: 'Element type is not supported for compliance evaluation. This element was not evaluated.'
    });
  }

  // Contrast compliance (if background color is available and text element)
  if (element.type === 'text' && typeof element.backgroundColor === 'string' && typeof element.textColor === 'string') {
    const ratio = contrastRatio(element.textColor, element.backgroundColor);
    if (ratio < BRAND_RULES.minContrastRatio) {
      violations.push({
        rule: 'Contrast Ratio',
        current: ratio.toFixed(2),
        expected: `>= ${BRAND_RULES.minContrastRatio}`,
        severity: 'critical',
        explanation: 'Contrast ratio between text and background is too low. This impacts readability and fails accessibility guidelines (WCAG AA).'
      });
    } else {
      contrastPass = true;
    }
  } else if (element.type === 'text') {
    // If no background color, skip contrast check but warn
    violations.push({
      rule: 'Contrast Ratio',
      current: element.backgroundColor,
      expected: `>= ${BRAND_RULES.minContrastRatio}`,
      severity: 'warning',
      explanation: 'Background color property is missing or unsupported. Unable to validate contrast ratio.'
    });
  }

  // Score calculation (unchanged)
  let score = 0;
  if (colorPass) score += RULE_WEIGHTS.color;
  if (fontPass) score += RULE_WEIGHTS.fontFamily;
  if (typoPass) score += RULE_WEIGHTS.typography;
  if (contrastPass) score += RULE_WEIGHTS.contrast;

  return {
    score,
    violations,
    notEvaluated,
    breakdown: {
      color: colorPass ? 'pass' : 'fail',
      fontFamily: fontPass ? 'pass' : 'fail',
      typography: typoPass ? 'pass' : 'warning',
      contrast: contrastPass ? 'pass' : 'fail',
    }
  };
}

/**
 * Batch compliance evaluation for multiple selected elements
 * @param {Array<Object>} elements - Array of element property objects
 * @returns {Object} Batch compliance result
 */
export function evaluateComplianceBatch(elements) {
  // This function must be called only with user-selected elements (Adobe sandbox requirement)
  // No full-document traversal is allowed
  const results = elements.map(evaluateCompliance);
  // Aggregate score: average of all element scores
  const avgScore = results.length ? results.reduce((sum, r) => sum + r.score, 0) / results.length : 0;
  const result = {
    score: Math.round(avgScore),
    violations: results.flatMap(r => r.violations),
    autofixProposals: [] // Placeholder, to be filled by autofix logic if needed
  };
  console.log("COMPLIANCE_RESULT", JSON.stringify(result, null, 2));
  return result;
}
