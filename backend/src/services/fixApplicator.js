/**
 * Fix Applicator Service
 * 
 * Generates Adobe Express SDK commands dynamically based on fix suggestions.
 * NO HARDCODED VALUES - all values come from fix.recommendedValue (from database).
 */

/**
 * Generate Adobe Express SDK commands for applying a fix
 * @param {Object} fix - Fix suggestion object (from fixSuggestionGenerator)
 * @param {Object} designData - Current design data
 * @returns {Promise<Array>} Array of Adobe Express SDK commands
 */
async function generateFixCommands(fix, designData) {
  const commands = [];
  
  // Route to appropriate command generator based on fix type
  switch (fix.type) {
    case 'color':
      commands.push(...generateColorUpdateCommand(fix, designData));
      break;
    
    case 'typography':
      commands.push(...generateTypographyUpdateCommand(fix, designData));
      break;
    
    case 'font_size':
      commands.push(...generateFontSizeUpdateCommand(fix, designData));
      break;
    
    case 'logo_size':
      commands.push(...generateLogoSizeUpdateCommand(fix, designData));
      break;
    
    case 'contrast':
      commands.push(...generateContrastUpdateCommand(fix, designData));
      break;
    
    case 'spacing':
      commands.push(...generateSpacingUpdateCommand(fix, designData));
      break;
    
    default:
      // Generic command structure
      commands.push({
        action: 'updateElement',
        elementId: fix.elementId,
        updates: {
          [fix.type]: fix.recommendedValue // Use value from database
        }
      });
  }
  
  return commands;
}

/**
 * Generate color update command
 * @private
 */
function generateColorUpdateCommand(fix, designData) {
  // Extract color value from fix.recommendedValue (from database)
  const colorValue = extractColorValue(fix.recommendedValue);
  
  return [{
    action: 'updateElement',
    elementId: fix.elementId,
    updates: {
      fill: colorValue, // From database via fix.recommendedValue
      color: colorValue // Some elements use 'color' instead of 'fill'
    },
    metadata: {
      fixId: fix.id,
      fixType: 'color',
      previousValue: fix.currentValue,
      newValue: colorValue, // From database
      reason: fix.reasoning
    }
  }];
}

/**
 * Generate typography update command
 * @private
 */
function generateTypographyUpdateCommand(fix, designData) {
  // Extract font family from fix.recommendedValue (from database)
  // Format: "Font Name, fallback1, fallback2" or just "Font Name"
  const fontFamily = fix.recommendedValue.split(',')[0].trim();
  
  return [{
    action: 'updateElement',
    elementId: fix.elementId,
    updates: {
      fontFamily: fontFamily, // From database via fix.recommendedValue
      font: fontFamily // Alternative property name
    },
    metadata: {
      fixId: fix.id,
      fixType: 'typography',
      previousValue: fix.currentValue,
      newValue: fontFamily, // From database
      reason: fix.reasoning
    }
  }];
}

/**
 * Generate font size update command
 * @private
 */
function generateFontSizeUpdateCommand(fix, designData) {
  // Extract numeric value from fix.recommendedValue (from database)
  // Format: "16px" or "16"
  const fontSize = extractNumericValue(fix.recommendedValue);
  
  return [{
    action: 'updateElement',
    elementId: fix.elementId,
    updates: {
      fontSize: fontSize, // From database via fix.recommendedValue
      fontSizePx: fontSize // Alternative property name
    },
    metadata: {
      fixId: fix.id,
      fixType: 'font_size',
      previousValue: fix.currentValue,
      newValue: `${fontSize}px`, // From database
      reason: fix.reasoning
    }
  }];
}

/**
 * Generate logo size update command
 * @private
 */
function generateLogoSizeUpdateCommand(fix, designData) {
  // Extract width from fix.recommendedValue (from database)
  // Format: "100px" or "100"
  const newWidth = extractNumericValue(fix.recommendedValue);
  
  const layer = designData.layers?.find(l => l.id === fix.elementId);
  const commands = [];
  
  // Update width
  commands.push({
    action: 'updateElement',
    elementId: fix.elementId,
    updates: {
      width: newWidth // From database via fix.recommendedValue
    },
    metadata: {
      fixId: fix.id,
      fixType: 'logo_size',
      previousValue: fix.currentValue,
      newValue: `${newWidth}px`, // From database
      reason: fix.reasoning
    }
  });
  
  // Maintain aspect ratio if height is available
  if (layer && layer.width && layer.height) {
    const aspectRatio = layer.height / layer.width;
    const newHeight = Math.round(newWidth * aspectRatio);
    
    commands.push({
      action: 'updateElement',
      elementId: fix.elementId,
      updates: {
        height: newHeight // Calculated to maintain aspect ratio
      },
      metadata: {
        fixId: fix.id,
        fixType: 'logo_size_height',
        reason: 'Maintaining aspect ratio'
      }
    });
  }
  
  return commands;
}

/**
 * Generate contrast update command (updates color to improve contrast)
 * @private
 */
function generateContrastUpdateCommand(fix, designData) {
  // Extract color from fix.recommendedValue (from database)
  const colorValue = extractColorValue(fix.recommendedValue);
  
  return [{
    action: 'updateElement',
    elementId: fix.elementId,
    updates: {
      textColor: colorValue, // From database via fix.recommendedValue
      color: colorValue, // Alternative property
      fill: colorValue // Another alternative
    },
    metadata: {
      fixId: fix.id,
      fixType: 'contrast',
      previousValue: fix.currentValue,
      newValue: colorValue, // From database
      reason: fix.reasoning
    }
  }];
}

/**
 * Generate spacing update command
 * @private
 */
function generateSpacingUpdateCommand(fix, designData) {
  // Extract spacing value from fix.recommendedValue (from database)
  // Format: "24px" or "24"
  const spacingValue = extractNumericValue(fix.recommendedValue);
  
  return [{
    action: 'updateElement',
    elementId: fix.elementId,
    updates: {
      margin: spacingValue, // From database via fix.recommendedValue
      padding: spacingValue, // Could be either, context-dependent
      gap: spacingValue // Alternative
    },
    metadata: {
      fixId: fix.id,
      fixType: 'spacing',
      previousValue: fix.currentValue,
      newValue: `${spacingValue}px`, // From database
      reason: fix.reasoning
    }
  }];
}

/**
 * Generate batch commands for applying multiple fixes
 * @param {Array} fixes - Array of fix suggestions
 * @param {Object} designData - Current design data
 * @returns {Promise<Array>} Array of all Adobe Express SDK commands
 */
async function generateBatchFixCommands(fixes, designData) {
  const allCommands = [];
  
  for (const fix of fixes) {
    if (fix.autoFixable) {
      const commands = await generateFixCommands(fix, designData);
      allCommands.push(...commands);
    }
  }
  
  return allCommands;
}

/**
 * Extract numeric value from string like "16px" or "16"
 * @private
 */
function extractNumericValue(value) {
  if (typeof value === 'number') {
    return value;
  }
  
  const match = String(value).match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Extract color value (hex code) from string
 * @private
 */
function extractColorValue(value) {
  // If it's already a hex color, return it
  if (typeof value === 'string' && /^#?[0-9A-Fa-f]{6}$/.test(value)) {
    return value.startsWith('#') ? value : `#${value}`;
  }
  
  // If format is "color: #HEX" or similar, extract hex
  const hexMatch = String(value).match(/#([0-9A-Fa-f]{6})/i);
  if (hexMatch) {
    return `#${hexMatch[1]}`;
  }
  
  // Return as-is (might be a color name or other format)
  return value;
}

module.exports = {
  generateFixCommands,
  generateBatchFixCommands
};
