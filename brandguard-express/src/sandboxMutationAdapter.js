// Adobe Express Add-on: Sandbox-Safe Mutation Adapter
// This module applies autofix instructions to a single selected design element using Adobe Express Document Sandbox APIs.
// All mutations are user-triggered, explicit, and limited to the provided element and properties.
// No batch, no recomputation, no background execution, no UI.

/**
 * Apply autofix instructions to a single selected element.
 *
 * @param {Object} elementRef - Reference to the selected element (Adobe Express sandbox object)
 * @param {Array<Object>} autofixInstructions - List of fix instructions from autofixEngine
 * @param {Object} sandboxApi - Adobe Express Document Sandbox API object (must be passed in)
 * @returns {Array<Object>} List of mutation results (success/failure per property)
 *
 * Note: This function does not recompute compliance or autofix logic.
 * It only applies the provided property changes, skipping unsupported properties with clear logging.
 * All operations are sandbox-safe and must be invoked only by explicit user action.
 */
export async function applyAutofixInstructions(elementRef, autofixInstructions, sandboxApi) {
  // Supported properties for mutation in Adobe Express sandbox
  const SUPPORTED_PROPERTIES = ['textColor', 'fontFamily', 'fontSize', 'fontWeight'];
  const results = [];

  for (const fix of autofixInstructions) {
    if (!SUPPORTED_PROPERTIES.includes(fix.property)) {
      // Skip unsupported properties with clear logging (for Adobe review)
      results.push({
        property: fix.property,
        status: 'skipped',
        reason: 'Property not supported for mutation in Adobe Express sandbox.'
      });
      continue;
    }
    try {
      // All mutations must use the sandbox API and only affect the selected element
      // Example: sandboxApi.setProperty(elementRef, property, value)
      // The actual API may differ; this is a placeholder for Adobe's documented mutation method
      await sandboxApi.setProperty(elementRef, fix.property, fix.proposed);
      results.push({
        property: fix.property,
        status: 'success',
        oldValue: fix.current,
        newValue: fix.proposed
      });
    } catch (err) {
      // Log and report mutation failure
      results.push({
        property: fix.property,
        status: 'failed',
        error: err && err.message ? err.message : String(err)
      });
    }
  }
  return results;
}

/**
 * Usage notes (for Adobe review):
 * - This adapter never scans or mutates other elements.
 * - All mutations are explicit and user-triggered.
 * - Unsupported properties are skipped, not errored.
 * - No UI, no batch, no background logic.
 */
