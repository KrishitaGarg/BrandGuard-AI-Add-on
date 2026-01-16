const express = require('express');
const router = express.Router();

// This endpoint applies a fix to a design
// Expected body: { designId, issueId, fix }

// Helper: apply a fix to the design object
function applyFixToDesign(design, issueId, fix) {
  // Example: fix = { elementId, property, value }
  if (!design || !fix || !fix.elementId || !fix.property) return design;
  const updatedDesign = { ...design };
  if (Array.isArray(updatedDesign.layers)) {
    updatedDesign.layers = updatedDesign.layers.map(layer => {
      if (layer.id === fix.elementId) {
        return { ...layer, [fix.property]: fix.value };
      }
      return layer;
    });
  }
  return updatedDesign;
}

router.post('/', async (req, res) => {
  const { design, issueId, fix } = req.body;
  if (!design || !fix) {
    return res.status(400).json({ success: false, error: "Missing design or fix data" });
  }
  // Apply the fix to the design
  const updatedDesign = applyFixToDesign(design, issueId, fix);
  // TODO: Optionally re-analyze design and return updated compliance info
  res.json({ success: true, issueId, appliedFix: fix, updatedDesign });
});

module.exports = router;
