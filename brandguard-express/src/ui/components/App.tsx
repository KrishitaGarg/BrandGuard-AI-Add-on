import "@spectrum-web-components/theme/express/scale-medium.js";
import "@spectrum-web-components/theme/express/theme-light.js";

import React, { useState, useEffect } from "react";
import { Button } from "@swc-react/button";
import { Theme } from "@swc-react/theme";
import "./App.css";
import { AddOnSDKAPI } from "https://new.express.adobe.com/static/add-on-sdk/sdk.js";
import { DocumentSandboxApi } from "../../models/DocumentSandboxApi";
import ViolationCard from "./ViolationCard";
import ScorePanel from "./ScorePanel";

type FixAction = {
  label: string;
  description?: string;
  preview?: string;
  apply: () => Promise<void>;
};

type AIInsight = {
  summary: string;
  strengths: string[];
  issues: {
    id: string;
    type: "text" | "visual" | "layout";
    explanation: string;
    severity: "low" | "medium" | "high";
    suggestion: string;
    autofix?: FixAction;
  }[];
};

const MCP_ENDPOINT = "http://localhost:3000";
const ENABLE_MCP = true;

const App = ({ addOnUISdk, sandboxProxy }: { addOnUISdk: AddOnSDKAPI; sandboxProxy: DocumentSandboxApi }) => {
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState("Idle");
  const [brandGuidelines, setBrandGuidelines] = useState("");
  const [brandConfig, setBrandConfig] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [fixing, setFixing] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);
  const [previewFix, setPreviewFix] = useState<any>(null);
  const [appliedFixes, setAppliedFixes] = useState<string[]>([]); // store applied autofix ids

  useEffect(() => {
    if (aiInsight !== null) {
      console.log("[DEBUG] Rendering aiInsight:", aiInsight);
    }
  }, [aiInsight]);

  async function handleImportGuidelines() {
    if (!brandGuidelines.trim()) {
      setStatus("Please paste brand guidelines first.");
      return;
    }
    setImporting(true);
    setImportError(null);
    setStatus("Importing brand guidelines...");
    try {
      setBrandConfig({ imported: true });
      setStatus("Brand guidelines imported");
    } catch {
      setImportError("Failed to import guidelines.");
      setStatus("Idle");
    } finally {
      setImporting(false);
    }
  }


  // Preview fix (shows what will change)
  function handlePreviewFix(fix: any) {
    setPreviewFix(fix);
  }

  // Apply fix (simulate, in real use call backend/sandbox)
  async function handleApplyFix(issueId: string, fix: any) {
    setFixing(true);
    setFixError(null);
    setStatus("Applying fix...");
    try {
      // Here, you would call sandboxProxy.applySuggestion or a new method with fix details
      // For now, just mark as applied
      setAppliedFixes((prev) => [...prev, issueId]);
      setPreviewFix(null);
      setStatus("Fix applied");
    } catch (err) {
      setFixError("Failed to apply fix.");
      setStatus("Idle");
    } finally {
      setFixing(false);
    }
  }

  // Undo fix (remove from appliedFixes)
  function handleUndoFix(issueId: string) {
    setAppliedFixes((prev) => prev.filter((id) => id !== issueId));
    setStatus("Fix undone");
  }

  async function handleAnalyzeClick() {
    if (!brandConfig) {
      setStatus("Please import brand guidelines first.");
      return;
    }
    setStatus("Analyzing design...");
    try {
      const analysis = await sandboxProxy.analyzeBrandCompliance();
      setResult(analysis);
      if (ENABLE_MCP) {
        setStatus("Fetching AI insights...");
        try {
          // Get the actual design object
          const design = await sandboxProxy.getDesign();
          const response = await fetch(`${MCP_ENDPOINT}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ design, brandRules: brandConfig }),
          });
          if (!response.ok) {
            throw new Error("MCP request failed");
          }
          const data = await response.json();
          if (data?.result?.ai) {
            setAiInsight(data.result.ai);
          } else {
            // Show local analysis summary if no AI insight
            setAiInsight({
              summary: analysis.status + (analysis.issues?.length ? ": " + analysis.issues.join(", ") : ""),
              strengths: [],
              issues: [],
            });
          }
          setStatus("Analysis + AI complete");
        } catch (mcpError) {
          setAiInsight({
            summary: "AI service unavailable. Showing local analysis only.",
            strengths: [],
            issues: [],
          });
          setStatus("Local analysis complete");
        }
      } else {
        setStatus("Local analysis complete");
      }
    } catch (err) {
      setStatus("Analysis failed");
    }
  }

  return (
    <Theme system="express" scale="medium" color="light">
      <div className="container">
        {/* Brand Guidelines */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600 }}>
            Paste Brand Guidelines:
          </label>
          <textarea
            value={brandGuidelines}
            onChange={(e) => setBrandGuidelines(e.target.value)}
            rows={4}
            style={{ width: "100%", marginTop: 8 }}
          />
          <Button
            variant="secondary"
            style={{ marginTop: 8 }}
            onClick={handleImportGuidelines}
          >
            {importing ? "Importing..." : "Update Brand Rules"}
          </Button>
          {importError && (
            <p style={{ color: "red", fontSize: 12 }}>{importError}</p>
          )}
          {brandConfig && (
            <p style={{ color: "green", fontSize: 12 }}>
              Brand rules loaded.
            </p>
          )}
        </div>
        <Button
          variant="primary"
          onClick={handleAnalyzeClick}
        >
          Analyze Brand Compliance
        </Button>
        <p style={{ marginTop: "10px", fontSize: "12px" }}>
          Status: {status}
        </p>
        {result && (
          <div style={{ marginTop: "14px", fontSize: "12px" }}>
            <p>
              <strong>Brand Score:</strong> {result.brandScore}/100
            </p>
            <p>
              Layers — Text: {result.textLayers}, Shapes: {result.shapeLayers}, Images: {result.imageLayers}
            </p>
            {result.issues.length > 0 && (
              <>
                <p><strong>Issues:</strong></p>
                <ul>
                  {result.issues.map((issue: string, i: number) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </>
            )}
            {result.suggestions && result.suggestions.length > 0 && (
              <>
                <p><strong>Suggestions:</strong></p>
                <ul>
                  {result.suggestions.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </>
            )}
            {/* Improved AI Insight/Summary logic */}
            {aiInsight && (
              <div style={{ marginTop: "10px", background: "#f4f4f4", padding: 10, borderRadius: 6 }}>
                <strong>AI Analysis</strong>
                <ScorePanel
                  score={result?.brandScore || 0}
                  strengths={aiInsight.strengths}
                  summary={aiInsight.summary}
                />
                {aiInsight.issues && aiInsight.issues.length > 0 && (
                  <div style={{ margin: "8px 0" }}>
                    <strong>Issues:</strong>
                    {aiInsight.issues.map((issue, i) => (
                      <div style={{ position: "relative" }}>
                        <ViolationCard
                          key={issue.id || i}
                          type={issue.type}
                          severity={issue.severity}
                          explanation={issue.explanation}
                          suggestion={issue.suggestion}
                          autofixLabel={issue.autofix?.label}
                          onAutofix={issue.autofix && !appliedFixes.includes(issue.id)
                            ? () => handleApplyFix(issue.id, issue.autofix)
                            : undefined}
                        />
                        {appliedFixes.includes(issue.id) && (
                          <Button variant="secondary" style={{ marginLeft: 8, position: "absolute", top: 8, right: 8 }} onClick={() => handleUndoFix(issue.id)}>
                            Undo
                          </Button>
                        )}
                        {issue.autofix && !appliedFixes.includes(issue.id) && (
                          <Button variant="secondary" style={{ marginLeft: 8, position: "absolute", top: 8, right: 80 }} onClick={() => handlePreviewFix(issue.autofix)}>
                            Preview
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* Preview Modal/Panel */}
                {previewFix && (
                  <div style={{ background: "#fffbe6", border: "1px solid #ffe58f", padding: 16, borderRadius: 8, marginTop: 12 }}>
                    <strong>Preview Fix:</strong>
                    <div><strong>Property:</strong> {previewFix.change.property}</div>
                    <div><strong>Before:</strong> {String(previewFix.change.before)}</div>
                    <div><strong>After:</strong> {String(previewFix.change.after)}</div>
                    <Button variant="primary" style={{ marginTop: 8 }} onClick={() => handleApplyFix(previewFix.id, previewFix)}>
                      Apply Fix
                    </Button>
                    <Button variant="secondary" style={{ marginLeft: 8 }} onClick={() => setPreviewFix(null)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Theme>
  );
};

export default App;


