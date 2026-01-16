import addOnSandboxSdk from "add-on-sdk-document-sandbox";
import { editor } from "express-document-sdk";
import { DocumentSandboxApi } from "../models/DocumentSandboxApi";

const { runtime } = addOnSandboxSdk.instance;

function start(): void {
  const sandboxApi: DocumentSandboxApi = {
    analyzeBrandCompliance: async () => {
      const root = editor.context.insertionParent;
      const children = Array.from(root.children);

      let textLayers = 0;
      let shapeLayers = 0;
      let imageLayers = 0;

      for (const node of children) {
        if ("text" in (node as object)) {
          textLayers++;
        } else if ("fill" in (node as object)) {
          shapeLayers++;
        } else {
          imageLayers++;
        }
      }

      const totalLayers = children.length;

      // -----------------
      // Brand score
      // -----------------
      let brandScore = 100;

      if (totalLayers > 10) brandScore -= 20;
      if (shapeLayers > 5) brandScore -= 20;
      if (imageLayers === 0) brandScore -= 10;

      brandScore = Math.max(0, brandScore);

      // -----------------
      // Issues
      // -----------------
      const issues: string[] = [];

      if (totalLayers > 10) {
        issues.push("Design has too many layers");
      }

      if (shapeLayers > 5) {
        issues.push("Too many decorative shapes");
      }

      if (textLayers === 0) {
        issues.push("No text found — weak brand messaging");
      }

      // -----------------
      // Suggestions
      // -----------------
      const suggestions: string[] = [];

      if (totalLayers > 10) {
        suggestions.push(
          "Reduce the total number of layers to improve visual clarity and focus."
        );
      }

      if (shapeLayers > 5) {
        suggestions.push(
          "Limit decorative shapes to maintain brand consistency."
        );
      }

      if (textLayers > imageLayers * 2) {
        suggestions.push(
          "The design is text-heavy. Adding visuals can improve balance and readability."
        );
      }

      return {
        status: "analysis_complete",
        totalLayers,
        textLayers,
        shapeLayers,
        imageLayers,
        brandScore,
        issues,
        suggestions,

        // IMPORTANT: AI is NOT generated here
        aiInsight: null,
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

  };

  runtime.exposeApi(sandboxApi);
}

start();


