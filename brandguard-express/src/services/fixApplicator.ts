/**
 * Fix Applicator Service
 * 
 * Applies fix actions to Adobe Express canvas using Document Sandbox API.
 * Frontend decides HOW to apply fixes (backend decides WHAT to fix).
 */

import type { DocumentSandboxApi } from '../models/DocumentSandboxApi';

export interface FixAction {
  type: 'update_color' | 'update_font' | 'resize_element' | 'replace_text';
  elementId: string;
  property?: string;
  value?: any;
  find?: string; // For replace_text
  replace?: string; // For replace_text
  maintainAspectRatio?: boolean; // For resize_element
}

/**
 * Apply a single fix action to Adobe Express canvas
 */
export async function applyFixAction(
  fixAction: FixAction,
  sandboxProxy: DocumentSandboxApi
): Promise<void> {
  try {
    // Get current design to find the element
    const design = await sandboxProxy.getDesign();
    const layer = design.layers?.find((l: any) => l.id === fixAction.elementId);

    if (!layer) {
      throw new Error(`Element ${fixAction.elementId} not found`);
    }

    // Apply fix based on type
    switch (fixAction.type) {
      case 'update_color':
        await updateElementColor(fixAction, design, sandboxProxy);
        break;

      case 'update_font':
        await updateElementFont(fixAction, design, sandboxProxy);
        break;

      case 'resize_element':
        await resizeElement(fixAction, design, sandboxProxy);
        break;

      case 'replace_text':
        await replaceText(fixAction, design, sandboxProxy);
        break;

      default:
        console.warn(`Unknown fix action type: ${(fixAction as any).type}`);
    }
  } catch (error) {
    console.error(`Error applying fix action:`, error);
    throw error;
  }
}

/**
 * Apply multiple fix actions in sequence
 */
export async function applyFixActions(
  fixActions: FixAction[],
  sandboxProxy: DocumentSandboxApi
): Promise<void> {
  for (const action of fixActions) {
    try {
      await applyFixAction(action, sandboxProxy);
    } catch (error) {
      console.error(`Error applying fix ${action.elementId}:`, error);
      // Continue with next fix even if one fails
    }
  }
}

/**
 * Update element color
 */
async function updateElementColor(
  fixAction: FixAction,
  design: any,
  sandboxProxy: DocumentSandboxApi
): Promise<void> {
  const updatedLayers = design.layers.map((l: any) => {
    if (l.id === fixAction.elementId) {
      return {
        ...l,
        fill: fixAction.value, // Apply color from fixAction
      };
    }
    return l;
  });

  await sandboxProxy.setDesign({
    layers: updatedLayers,
    canvas: design.canvas,
  });
}

/**
 * Update element font
 */
async function updateElementFont(
  fixAction: FixAction,
  design: any,
  sandboxProxy: DocumentSandboxApi
): Promise<void> {
  const updatedLayers = design.layers.map((l: any) => {
    if (l.id === fixAction.elementId) {
      return {
        ...l,
        fontFamily: fixAction.value, // Apply font from fixAction
      };
    }
    return l;
  });

  await sandboxProxy.setDesign({
    layers: updatedLayers,
    canvas: design.canvas,
  });
}

/**
 * Resize element
 */
async function resizeElement(
  fixAction: FixAction,
  design: any,
  sandboxProxy: DocumentSandboxApi
): Promise<void> {
  const layer = design.layers.find((l: any) => l.id === fixAction.elementId);
  if (!layer) return;

  const updatedLayers = design.layers.map((l: any) => {
    if (l.id === fixAction.elementId) {
      const updates: any = {
        ...l,
        width: fixAction.value, // Apply width from fixAction
      };

      // Maintain aspect ratio if requested
      if (fixAction.maintainAspectRatio && layer.width && layer.height) {
        const aspectRatio = layer.height / layer.width;
        updates.height = Math.round(fixAction.value * aspectRatio);
      }

      return updates;
    }
    return l;
  });

  await sandboxProxy.setDesign({
    layers: updatedLayers,
    canvas: design.canvas,
  });
}

/**
 * Replace text in element
 */
async function replaceText(
  fixAction: FixAction,
  design: any,
  sandboxProxy: DocumentSandboxApi
): Promise<void> {
  if (!fixAction.find || !fixAction.replace) {
    throw new Error('replace_text requires find and replace properties');
  }

  const updatedLayers = design.layers.map((l: any) => {
    if (l.id === fixAction.elementId && l.content) {
      // Replace text content
      const updatedContent = (l.content as string).replace(
        new RegExp(fixAction.find!, 'gi'),
        fixAction.replace!
      );

      return {
        ...l,
        content: updatedContent,
      };
    }
    return l;
  });

  await sandboxProxy.setDesign({
    layers: updatedLayers,
    canvas: design.canvas,
  });
}
