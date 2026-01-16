import "@spectrum-web-components/theme/express/scale-medium.js";
import "@spectrum-web-components/theme/express/theme-light.js";

import React, { useState, useEffect } from "react";
import { Button } from "@swc-react/button";
import { Theme } from "@swc-react/theme";
import "./App.css";


import { defaultBrandProfile, validateBrandProfile, BrandProfile } from "../../brandProfile";
import type { DocumentSandboxApi } from "../../models/DocumentSandboxApi";
import type { AddOnSDKAPI } from "https://new.express.adobe.com/static/add-on-sdk/sdk.js";
import ScorePanel from "./ScorePanel";
import FixesPanel from "./fixes/FixesPanel";

type FixAction = {
  label: string;
  description?: string;
  preview?: string;
  apply: () => Promise<void>;
};

// ...existing code...

const App = ({ addOnUISdk, sandboxProxy }: { addOnUISdk: AddOnSDKAPI; sandboxProxy: DocumentSandboxApi }) => {
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState("Idle");
  // Structured brand profile state
  const [brandProfile, setBrandProfile] = useState<BrandProfile>(defaultBrandProfile);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  // NEW: Fixes panel state
  const [showFixes, setShowFixes] = useState(false);
  const [designId] = useState<string>(() => `design-${Date.now()}`); // Generate unique design ID
  // Autofix and preview state removed for Phase 1 compliance-only UI




  // UI handler for updating brand profile fields
  function handleProfileChange<K extends keyof BrandProfile>(key: K, value: BrandProfile[K]) {
    setBrandProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAnalyzeClick() {
    setStatus("Analyzing design...");
    try {
      // Pass brandProfile as payload to sandbox
      const analysis = await sandboxProxy.analyzeBrandCompliance({ brandProfile });
      setResult(analysis);
      setStatus("Analysis complete");
    } catch (err) {
      setStatus("Analysis failed");
    }
  }

  return (
    <Theme system="express" scale="medium" color="light">
      <div className="container">
        {/* Structured Brand Profile Editor */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600 }}>Brand Profile</label>
          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <label>Tone Preference: </label>
            <select
              value={brandProfile.tonePreference}
              onChange={e => handleProfileChange("tonePreference", e.target.value as any)}
            >
              <option value="formal">Formal</option>
              <option value="neutral">Neutral</option>
              <option value="friendly">Friendly</option>
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Claims Strictness: </label>
            <select
              value={brandProfile.claimsStrictness}
              onChange={e => handleProfileChange("claimsStrictness", e.target.value as any)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Disallowed Phrases: </label>
            <input
              type="text"
              value={brandProfile.disallowedPhrases.join(", ")}
              onChange={e => handleProfileChange("disallowedPhrases", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
              style={{ width: "100%" }}
              placeholder="e.g. free, best ever, 100% guaranteed"
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Preferred Terms: </label>
            <input
              type="text"
              value={brandProfile.preferredTerms.join(", ")}
              onChange={e => handleProfileChange("preferredTerms", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
              style={{ width: "100%" }}
              placeholder="e.g. innovative, trusted, sustainable"
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Brand Description: </label>
            <textarea
              value={brandProfile.brandDescription}
              onChange={e => handleProfileChange("brandDescription", e.target.value)}
              rows={2}
              style={{ width: "100%" }}
              placeholder="Describe your brand for AI context (optional)"
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Brand Memory (always allow / never flag):</label>
            <textarea
              value={brandProfile.memory?.map(m => `${m.action}:${m.phrase}`).join("\n")}
              onChange={e => {
                const lines = e.target.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                const memory = lines.map(line => {
                  const [action, ...rest] = line.split(":");
                  return action && rest.length > 0 ? { action: action.trim() as any, phrase: rest.join(":").trim() } : null;
                }).filter(Boolean) as any;
                handleProfileChange("memory", memory);
              }}
              rows={2}
              style={{ width: "100%" }}
              placeholder="alwaysAllow:Our unique phrase\nneverFlag:Legal disclaimer"
            />
          </div>
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
            <ScorePanel score={result.brandScore || 0} />
            {result.issues && result.issues.length > 0 ? (
              <>
                <p><strong>Issues:</strong></p>
                <ul>
                  {result.issues.map((issue: string, i: number) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p>No compliance issues found for the selected elements.</p>
            )}
            {/* NEW: View Fixes button (only show when score < 100%) */}
            {(result.brandScore || 0) < 100 && (
              <div style={{ marginTop: "12px" }}>
                <Button
                  variant="secondary"
                  onClick={() => setShowFixes(!showFixes)}
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                >
                  {showFixes ? "Hide Suggested Fixes" : "View Suggested Fixes"}
                </Button>
              </div>
            )}
          </div>
        )}
        {/* NEW: Fixes Panel (conditionally rendered) */}
        {showFixes && result && (
          <div style={{ marginTop: "16px", borderTop: "1px solid #e0e0e0", paddingTop: "16px" }}>
            <FixesPanel
              designId={designId}
              brandId="default-brand" // TODO: Get from brandProfile or user selection
              industry="general" // TODO: Get from brandProfile or user selection
              complianceResults={{
                violations: [], // TODO: Transform result.issues to violations format
                score: result.brandScore || 0,
                design: { layers: [] } // TODO: Get from sandbox
              }}
              design={{ layers: [] }} // TODO: Get from sandbox
              brandRules={{
                brandId: "default-brand",
                visual: {
                  colors: [], // TODO: Extract from brandProfile if available
                  fonts: [],
                  logo: {}
                },
                content: {
                  tone: brandProfile.tonePreference || "professional",
                  forbiddenPhrases: brandProfile.disallowedPhrases || [],
                  locale: "en-US"
                }
              }}
              onFixApplied={async () => {
                // Re-analyze after fix is applied
                await handleAnalyzeClick();
              }}
              sandboxProxy={sandboxProxy}
            />
          </div>
        )}
      </div>
    </Theme>
  );
};

export default App;


