
import { analyzeTextCompliance } from "../textComplianceEngine";
import { defaultBrandProfile, validateBrandProfile, BrandProfile } from "../brandProfile";
import addOnSandboxSdk from "add-on-sdk-document-sandbox";
import { editor } from "express-document-sdk";
import { DocumentSandboxApi } from "../models/DocumentSandboxApi";


const { runtime } = addOnSandboxSdk.instance;

function start(): void {

  // Dummy AI API call (replace with real OpenAI call in production)
  /**
   * Dummy AI API call (replace with real OpenAI call in production)
   * @param prompt {object} - AI prompt object for text compliance
   * @returns {Promise<{score: number, issues: any[]}>}
   */
  async function aiApiCall(prompt: { [key: string]: any }): Promise<{ score: number; issues: any[] }> {
    // This is a placeholder. In production, call your OpenAI endpoint here.
    // For safety, always return the required schema.
    return {
      score: 100,
      issues: []
    };
  }

  const sandboxApi: DocumentSandboxApi = {
    analyzeBrandCompliance: async ({ brandProfile }) => {
      // Defensive validation: fail fast if brandProfile is missing or malformed
      if (!brandProfile || typeof brandProfile !== 'object') {
        throw new Error("Brand profile missing or not an object");
      }
      if (!Array.isArray(brandProfile.disallowedPhrases)) {
        throw new Error("brandProfile.disallowedPhrases must be an array");
      }
      if (!brandProfile.disallowedPhrases.every(p => typeof p === 'string' && p.trim().length > 0)) {
        throw new Error("brandProfile.disallowedPhrases must be non-empty strings");
      }

      const root = editor.context.insertionParent;
      const children = Array.from(root.children);

      // Debug log: detected elements
      const elements = children.map((node: any) => ({
        id: node.id,
        type: node.text !== undefined ? 'text' : node.fill !== undefined ? 'shape' : 'image',
        text: node.text || null
      }));
      console.log("DETECTED ELEMENTS:", elements);

      // Debug log: brand profile received
      console.log("BRAND PROFILE RECEIVED:", JSON.stringify(brandProfile, null, 2));

      // Debug log: disallowed phrases
      console.log("DISALLOWED PHRASES USED:", brandProfile.disallowedPhrases);

      let textLayers = 0;
      let shapeLayers = 0;
      let imageLayers = 0;
      let textComplianceResults = [];
      let textComplianceScoreSum = 0;
      let textComplianceIssues = [];

      for (const node of children) {
        if ("text" in (node as object)) {
          textLayers++;
          const text = (node as any).text || "";
          // Debug log: text sent to compliance engine
          console.log("TEXT ANALYZED:", text);
          const result = await analyzeTextCompliance(text, brandProfile, aiApiCall);
          textComplianceResults.push(result);
          textComplianceScoreSum += result.score;
          if (result.issues && result.issues.length > 0) {
            textComplianceIssues.push(...result.issues);
          }
        } else if ("fill" in (node as object)) {
          shapeLayers++;
        } else {
          imageLayers++;
        }
      }

      const totalLayers = children.length;

      // -----------------
      // Visual Brand score (Phase 1, unchanged)
      // -----------------
      let visualScore = 100;
      const visualIssues: string[] = [];
      if (totalLayers > 10) {
        visualScore -= 20;
        visualIssues.push("Design has too many layers");
      }
      if (shapeLayers > 5) {
        visualScore -= 20;
        visualIssues.push("Too many decorative shapes");
      }
      if (imageLayers === 0) {
        visualScore -= 10;
        visualIssues.push("No images found — add visuals for balance");
      }
      visualScore = Math.max(0, visualScore);

      // -----------------
      // Text Compliance Score (Phase 2)
      // -----------------
      let textScore = 100;
      if (textLayers > 0) {
        textScore = Math.round(textComplianceScoreSum / textLayers);
      }

      // -----------------
      // Weighted Merge (Visual 70%, Text 30%)
      // -----------------
      const brandScore = Math.round(visualScore * 0.7 + textScore * 0.3);

      // -----------------
      // Issues
      // -----------------
      const issues: string[] = [...visualIssues];
      // Add text compliance issues as explainable, labeled AI suggestions
      for (const issue of textComplianceIssues) {
        issues.push(
          `[AI suggestion] ${issue.type}: ${issue.explanation}`
        );
        if (issue.rewriteSuggestions && issue.rewriteSuggestions.length > 0) {
          for (const suggestion of issue.rewriteSuggestions) {
            issues.push(
              `Rewrite (${suggestion.style}): ${suggestion.text}`
            );
          }
        }
      }

      return {
        status: "analysis_complete",
        totalLayers,
        textLayers,
        shapeLayers,
        imageLayers,
        brandScore,
        issues,
        // For review: include raw text compliance results (not for UI)
        textComplianceResults
      };
    },
    // Simple auto-fix: remove extra layers if too many, or add a text layer if none
    applySuggestion: async () => {
      const root = editor.context.insertionParent;
      let layers = Array.from(root.children);
      let actions: string[] = [];

      // Remove extra layers if >8
      if (layers.length > 8) {
        const toRemove = layers.length - 8;
        for (let i = 0; i < toRemove; i++) {
          const layer = layers[layers.length - 1 - i];
          // @ts-ignore: SDK types may be incomplete
          (root as any).removeChild(layer);
        }
        actions.push(`Removed ${toRemove} extra layer(s)`);
      }

      // Add a text layer if none
      let hasText = false;
      for (const layer of Array.from(root.children)) {
        if ((layer as any).text !== undefined) {
          hasText = true;
          break;
        }
      }
      if (!hasText) {
        const newText = editor.createText("Brand Message");
        // @ts-ignore: SDK types may be incomplete
        (root as any).appendChild(newText);
        actions.push("Added a text layer for brand messaging");
      }

      return {
        status: "fix_applied",
        message: actions.length > 0 ? actions.join("; ") : "No changes needed",
      };
    },
    getDesign: async () => {
      const root = editor.context.insertionParent;
      const layers = Array.from(root.children).map((layer: any) => ({
        id: layer.id,
        type: layer.text !== undefined ? "text" : layer.fill !== undefined ? "shape" : "image",
        fill: layer.fill,
        fontFamily: layer.fontFamily,
        content: layer.text,
        width: layer.width,
      }));
      return { layers };
    },
    setDesign: async (design) => {
      const root = editor.context.insertionParent;
      if (!design || !Array.isArray(design.layers)) return;
      // Remove all existing layers
      while (root.children.length > 0) {
        (root as any).removeChild(root.children.item(0));
      }
      // Add new layers from design
      for (const layer of design.layers) {
        let newLayer;
        if (layer.type === "text") {
          newLayer = (editor as any).createText(layer.content || "");
          if (layer.fontFamily) (newLayer as any).fontFamily = layer.fontFamily;
        } else if (layer.type === "shape") {
          newLayer = (editor as any).createShape();
          if (layer.fill) (newLayer as any).fill = layer.fill;
        } else if (layer.type === "image") {
          newLayer = (editor as any).createImage();
        }
        if (newLayer) {
          newLayer.id = layer.id;
          if (layer.width) newLayer.width = layer.width;
          (root as any).appendChild(newLayer);
        }
      }
    },

  };

  runtime.exposeApi(sandboxApi);
}

start();


