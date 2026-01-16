
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
    console.log("[AI] aiApiCall triggered with prompt:", prompt);
    
    // Extract text and brand guidelines from prompt
    const text = prompt.text || '';
    const brandGuidelines = prompt.brandGuidelines || {};
    
    if (!text || typeof text !== 'string') {
      console.log("[AI] No text provided, returning empty result");
      return { score: 100, issues: [] };
    }

    try {
      // Call backend Groq API via /api/analyze endpoint
      // Transform to match backend expected format
      const design = {
        layers: [
          {
            type: 'text',
            content: text,
          }
        ]
      };

      const brandRules = {
        content: {
          tone: brandGuidelines.tonePreference || brandGuidelines.tone || 'neutral',
          forbiddenPhrases: brandGuidelines.disallowedPhrases || [],
        },
        visual: {
          colors: [],
          fonts: [],
        }
      };

      console.log("[AI] Calling backend /api/analyze for text analysis");
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          design,
          brandRules,
        }),
      });

      if (!response.ok) {
        console.error("[AI] Backend call failed:", response.statusText);
        return { score: 100, issues: [] };
      }

      const backendResult = await response.json();
      console.log("[AI] Backend response received:", backendResult);

      // Extract AI issues from backend response
      // The backend Groq analysis returns issues in result.ai.issues
      let aiIssues = [];
      if (backendResult.result?.ai?.issues && Array.isArray(backendResult.result.ai.issues)) {
        aiIssues = backendResult.result.ai.issues;
      }

      // Transform backend issues to frontend format expected by analyzeTextCompliance
      let issues = aiIssues
        .filter((issue: any) => issue && typeof issue === 'object')
        .map((issue: any) => {
          // Create rewrite suggestions from various sources
          const rewriteSuggestions: any[] = [];
          
          // If issue has autofix with suggested text
          if (issue.autofix?.text && typeof issue.autofix.text === 'string') {
            rewriteSuggestions.push({
              style: 'neutral',
              text: issue.autofix.text
            });
          }
          
          // If issue has suggestion text (this is the most common format from Groq)
          if (issue.suggestion && typeof issue.suggestion === 'string' && issue.suggestion.trim().length > 0) {
            // Check if suggestion is a full sentence rewrite or just a word/phrase
            const suggestionText = issue.suggestion.trim();
            // If it's different from original text and looks like a sentence, use it
            if (suggestionText !== text && suggestionText.length > 5) {
              rewriteSuggestions.push({
                style: 'neutral',
                text: suggestionText
              });
            }
          }
          
          // If issue already has rewriteSuggestions array
          if (Array.isArray(issue.rewriteSuggestions)) {
            for (const sug of issue.rewriteSuggestions) {
              if (sug && typeof sug === 'object' && sug.text && typeof sug.text === 'string') {
                rewriteSuggestions.push({
                  style: sug.style || 'neutral',
                  text: sug.text
                });
              }
            }
          }

          return {
            type: issue.type || 'Brand voice deviation',
            severity: issue.severity === 'critical' ? 'critical' : 'warning',
            explanation: issue.explanation || issue.suggestion || '',
            rewriteSuggestions: rewriteSuggestions.length > 0 ? rewriteSuggestions : [],
            _originalIssue: issue // Keep reference for fallback suggestion generation
          };
        });

      // Ensure all issues have rewrite suggestions
      // If Groq didn't provide suggestions, generate them
      for (const issue of issues) {
        if (issue.rewriteSuggestions.length === 0 && issue.explanation) {
          // Try to extract suggestion from the original backend issue
          const originalIssue = (issue as any)._originalIssue;
          
          if (originalIssue?.suggestion && typeof originalIssue.suggestion === 'string' && originalIssue.suggestion.trim() !== text) {
            // Use the suggestion field as a rewrite
            issue.rewriteSuggestions.push({
              style: 'neutral',
              text: originalIssue.suggestion.trim()
            });
            console.log("[AI] Added suggestion from original issue.suggestion field");
          } else {
            // If still no suggestion, create a basic one by applying word-level fixes
            // This ensures every issue has at least a suggested fix
            try {
              const { applyAutofix } = await import("../services/autofixService");
              const autofixResult = await applyAutofix({
                text: text,
                issues: [issue],
                brandGuidelines: {
                  preferredTerms: {},
                  disallowedTerms: brandRules.content.forbiddenPhrases || [],
                  toneRules: [brandRules.content.tone]
                }
              });
              
              if (autofixResult.success && autofixResult.fixedText !== text && autofixResult.fixedText.length > 0) {
                issue.rewriteSuggestions.push({
                  style: 'neutral',
                  text: autofixResult.fixedText
                });
                console.log("[AI] Generated suggestion using word-level autofix");
              }
            } catch (error) {
              console.error("[AI] Error generating fallback suggestion:", error);
            }
          }
        }
      }
      
      // Clean up temporary reference
      issues.forEach((issue: any) => {
        delete issue._originalIssue;
      });

      // Filter to only include issues with explanations (keep all detected issues)
      issues = issues.filter((issue: any) => issue.explanation);

      // Calculate score based on issues (lower score for more issues)
      const score = issues.length === 0 ? 100 : Math.max(0, 100 - (issues.length * 15));

      console.log("[AI] Returning", issues.length, "issues with score", score);
      if (issues.length > 0) {
        console.log("[AI] Issues with suggestions:", issues.filter((i: any) => i.rewriteSuggestions.length > 0).length);
        console.log("[AI] Sample issue:", JSON.stringify(issues[0], null, 2));
      }
      return { score, issues };
    } catch (error) {
      console.error("[AI] Error calling backend:", error);
      // Return empty result on error (non-blocking)
      return { score: 100, issues: [] };
    }
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
          let layerId = (node as any).id;
          
          // Ensure layer has an ID for autofix matching
          if (!layerId) {
            layerId = `text-layer-${textLayers}`;
            (node as any).id = layerId;
          }
          
          // Debug log: text sent to compliance engine
          console.log("TEXT ANALYZED:", text, "LayerId:", layerId);
          const result = await analyzeTextCompliance(text, brandProfile, aiApiCall);
          // Include layer ID and original text for autofix
          textComplianceResults.push({
            ...result,
            layerId,
            originalText: text,
          });
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
      const issues: string[] = [];
      const seen = new Set<string>();
      // Add visual issues first
      for (const v of visualIssues) {
        if (!seen.has(v)) {
          issues.push(v);
          seen.add(v);
        }
      }
      // Add text compliance issues as explainable, labeled AI suggestions
      for (const issue of textComplianceIssues) {
        const mainStr = `[AI suggestion] ${issue.type}: ${issue.explanation}`;
        if (!seen.has(mainStr)) {
          issues.push(mainStr);
          seen.add(mainStr);
        }
        if (issue.rewriteSuggestions && issue.rewriteSuggestions.length > 0) {
          for (const suggestion of issue.rewriteSuggestions) {
            let sugStr = '';
            if ('style' in suggestion && 'text' in suggestion) {
              sugStr = `Rewrite (${suggestion.style}): ${suggestion.text}`;
            } else if ('type' in suggestion && suggestion.type === 'preferred-term') {
              sugStr = `Preferred term: Replace '${suggestion.original}' with '${suggestion.replacement}' (${suggestion.reason})`;
            }
            if (sugStr && !seen.has(sugStr)) {
              issues.push(sugStr);
              seen.add(sugStr);
            }
          }
        }
        if (issue.suggestions && issue.suggestions.length > 0) {
          for (const suggestion of issue.suggestions) {
            let sugStr = '';
            if ('style' in suggestion && 'text' in suggestion) {
              sugStr = `Rewrite (${suggestion.style}): ${suggestion.text}`;
            } else if ('type' in suggestion && suggestion.type === 'preferred-term') {
              sugStr = `Preferred term: Replace '${suggestion.original}' with '${suggestion.replacement}' (${suggestion.reason})`;
            }
            if (sugStr && !seen.has(sugStr)) {
              issues.push(sugStr);
              seen.add(sugStr);
            }
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
    
    // Apply text fix to a specific layer
    applyTextFix: async ({ layerId, fixedText, originalText }) => {
      const root = editor.context.insertionParent;
      const children = Array.from(root.children);
      
      // Find the layer by ID first, or fallback to matching by original text
      let layer = children.find((node: any) => node.id === layerId);
      
      // Fallback: if not found by ID, try to match by original text content
      if (!layer && originalText) {
        layer = children.find((node: any) => 
          "text" in node && (node as any).text === originalText
        );
      }
      
      if (!layer) {
        console.warn(`Layer ${layerId} not found. Available layers:`, 
          children.map((n: any) => ({ id: n.id, hasText: "text" in n, text: (n as any).text }))
        );
        return {
          status: "error",
          message: `Layer ${layerId} not found`
        };
      }

      // Ensure layer has an ID for future lookups
      if (!layer.id) {
        (layer as any).id = layerId;
      }

      // Update text content - try direct assignment first
      if ("text" in layer) {
        const oldText = (layer as any).text;
        
        // Direct assignment - this should work with Adobe Express SDK
        (layer as any).text = fixedText;
        
        // Force a re-render by accessing the property again
        // Adobe Express SDK may need this to recognize the change
        const newTextValue = (layer as any).text;
        
        if (newTextValue === fixedText) {
          return {
            status: "fix_applied",
            message: `Text updated for layer ${layerId}: "${oldText}" -> "${fixedText}"`
          };
        } else {
          // Direct assignment didn't persist - use layer replacement as fallback
          console.warn(`Direct text assignment failed, using layer replacement fallback`);
          
          try {
            // Save layer properties before removal
            const layerIndex = children.indexOf(layer);
            const fontFamily = (layer as any).fontFamily;
            const width = (layer as any).width;
            
            // Remove old layer
            (root as any).removeChild(layer);
            
            // Create new text layer with fixed text
            const newLayer = (editor as any).createText(fixedText);
            if (fontFamily) (newLayer as any).fontFamily = fontFamily;
            if (width) (newLayer as any).width = width;
            (newLayer as any).id = layerId;
            
            // Insert at the same position
            if (layerIndex < root.children.length) {
              const refNode = root.children.item(layerIndex);
              if (refNode) {
                (root as any).insertBefore(newLayer, refNode);
              } else {
                (root as any).appendChild(newLayer);
              }
            } else {
              (root as any).appendChild(newLayer);
            }
            
            return {
              status: "fix_applied",
              message: `Text updated via layer replacement for layer ${layerId}: "${oldText}" -> "${fixedText}"`
            };
          } catch (replaceError) {
            console.error("Layer replacement failed:", replaceError);
            return {
              status: "error",
              message: `Failed to update text for layer ${layerId}: ${replaceError}`
            };
          }
        }
      }

      return {
        status: "error",
        message: `Layer ${layerId} is not a text layer`
      };
    },

  };

  runtime.exposeApi(sandboxApi);
}

start();


