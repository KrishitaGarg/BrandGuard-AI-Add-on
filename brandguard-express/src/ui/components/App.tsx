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
import AutofixPanel from "./AutofixPanel";

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
      // Use existing sandbox analysis (don't break existing flow)
      const analysis = await sandboxProxy.analyzeBrandCompliance({ brandProfile });
      setResult(analysis);
      setStatus("Analysis complete");
    } catch (err) {
      console.error("Analysis error:", err);
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
            <div style={{ fontSize: 11, color: '#888' }}>Controls how formal the language should be</div>
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
            <div style={{ fontSize: 11, color: '#888' }}>Controls how aggressively marketing claims are flagged</div>
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
            <div style={{ fontSize: 11, color: '#888' }}>Phrases your brand never allows</div>
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
            <div style={{ fontSize: 11, color: '#888' }}>Words or styles your brand prefers</div>
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
            <div style={{ fontSize: 11, color: '#888' }}>Describe your brand for context (optional)</div>
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
              placeholder="alwaysAllow:Our unique phrase\neverFlag:Legal disclaimer"
            />
            <div style={{ fontSize: 11, color: '#888' }}>Override rules for specific phrases</div>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={handleAnalyzeClick}
          disabled={status === "Analyzing design..."}
        >
          {status === "Analyzing design..." ? "Analyzing..." : "Analyze Brand Compliance"}
        </Button>
        <p style={{ marginTop: "10px", fontSize: "12px" }}>
          Status: {status}
        </p>
        {!result && status === "Idle" && (
          <div style={{ marginTop: 24, color: '#888', fontSize: 14 }}>
            Select a text element to analyze brand compliance.
          </div>
        )}
        {result && (
          <div style={{ marginTop: "14px", fontSize: "12px" }}>
            <ScorePanel score={result.brandScore || 0} />
            {/* Issue grouping and hierarchy */}
            {result.issues && result.issues.length > 0 ? (
              <>
                <div style={{ marginBottom: 8 }}>
                  <strong>Issues</strong>
                </div>
                {(() => {
                  // Group issues by type
                  const groups: { [type: string]: Array<string | JSX.Element> } = {};
                  result.issues.forEach((issue: string | JSX.Element) => {
                    let type = "Other";
                    if (typeof issue === 'string') {
                      if (issue.includes("disallowed phrase") || issue.toLowerCase().includes("disallowed")) type = "Disallowed Phrases";
                      else if (issue.toLowerCase().includes("tone mismatch")) type = "Tone Mismatch";
                      else if (issue.toLowerCase().includes("risky phrasing") || issue.toLowerCase().includes("claims")) type = "Risky Claims";
                      else if (issue.toLowerCase().includes("suggestion")) type = "Suggestions";
                    }
                    if (!groups[type]) groups[type] = [];
                    groups[type].push(issue);
                  });
                  return Object.entries(groups).map(([type, issuesArr], idx) => (
                    <div key={type} style={{ marginBottom: 18 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                        {type} <span style={{ background: '#eee', borderRadius: 10, padding: '2px 8px', fontSize: 12, marginLeft: 6 }}>{issuesArr.length} issue{issuesArr.length > 1 ? 's' : ''}</span>
                      </div>
                      <ul style={{ paddingLeft: 16 }}>
                        {issuesArr.map((issue, i) => {
                          if (typeof issue !== 'string') {
                            // If issue is a JSX element, render it directly
                            return (
                              <li key={i} style={{ marginBottom: 8, listStyle: 'none', borderLeft: '4px solid #bdbdbd', background: '#f7f7fa', padding: '8px 12px', borderRadius: 6 }}>
                                {issue}
                              </li>
                            );
                          }
                          // Violation vs suggestion distinction
                          const isSuggestion = issue.toLowerCase().includes("suggestion") || issue.toLowerCase().includes("replace") || issue.toLowerCase().includes("use a");
                          const isViolation = !isSuggestion;
                          // Improved issue text rendering
                          let improvedText: JSX.Element | string = issue;
                          // Disallowed phrase violation
                          if (typeof issue === 'string' && issue.match(/disallowed phrase '(.+?)'/i)) {
                            const match = issue.match(/disallowed phrase '(.+?)'/i);
                            const penaltyMatch = issue.match(/penalty: (-?\d+)/i);
                            improvedText = (
                              <>
                                <div><span style={{ color: '#d32f2f', fontWeight: 600 }}>Disallowed phrase detected:</span> <span style={{ background: '#ffeaea', borderRadius: 4, padding: '2px 6px', fontWeight: 500 }}>{match ? match[1] : ''}</span></div>
                                <div style={{ color: '#555', marginTop: 2 }}>Rule violated: <span style={{ fontWeight: 500 }}>Disallowed Phrases</span></div>
                                {penaltyMatch && <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 2 }}>Penalty: {penaltyMatch[1]} (must fix)</div>}
                              </>
                            );
                          }
                          // Tone mismatch
                          else if (typeof issue === 'string' && issue.match(/tone mismatch.*phrase '(.+?)'/i)) {
                            const match = issue.match(/tone mismatch.*phrase '(.+?)'/i);
                            const penaltyMatch = issue.match(/penalty: (-?\d+)/i);
                            improvedText = (
                              <>
                                <div><span style={{ color: '#d32f2f', fontWeight: 600 }}>Tone mismatch detected:</span> <span style={{ background: '#ffeaea', borderRadius: 4, padding: '2px 6px', fontWeight: 500 }}>{match ? match[1] : ''}</span></div>
                                <div style={{ color: '#555', marginTop: 2 }}>Rule violated: <span style={{ fontWeight: 500 }}>Tone Preference</span></div>
                                {penaltyMatch && <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 2 }}>Penalty: {penaltyMatch[1]} (must fix)</div>}
                              </>
                            );
                          }
                          // Risky claims
                          else if (typeof issue === 'string' && issue.match(/claims strictness.*phrase '(.+?)'/i)) {
                            const match = issue.match(/claims strictness.*phrase '(.+?)'/i);
                            const penaltyMatch = issue.match(/penalty: (-?\d+)/i);
                            improvedText = (
                              <>
                                <div><span style={{ color: '#d32f2f', fontWeight: 600 }}>Risky claim detected:</span> <span style={{ background: '#ffeaea', borderRadius: 4, padding: '2px 6px', fontWeight: 500 }}>{match ? match[1] : ''}</span></div>
                                <div style={{ color: '#555', marginTop: 2 }}>Rule violated: <span style={{ fontWeight: 500 }}>Claims Strictness</span></div>
                                {penaltyMatch && <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 2 }}>Penalty: {penaltyMatch[1]} (must fix)</div>}
                              </>
                            );
                          }
                          // Suggestions (diff-style formatting preserved)
                          else if (typeof issue === 'string' && isSuggestion && issue.match(/Replace '(.+?)' with '(.+?)'/)) {
                            const match = issue.match(/Replace '(.+?)' with '(.+?)'/);
                            improvedText = match ? (
                              <div>
                                <span style={{ textDecoration: 'line-through', color: '#888', marginRight: 6 }}>{match[1]}</span>
                                <span style={{ color: '#388e3c', fontWeight: 600 }}>{match[2]}</span>
                              </div>
                            ) : <div>{issue.replace('[AI suggestion] ', '')}</div>;
                          } else if (typeof issue === 'string' && isSuggestion && issue.match(/Use a (.+?)-style alternative instead of '(.+?)'/)) {
                            const match = issue.match(/Use a (.+?)-style alternative instead of '(.+?)'/);
                            improvedText = match ? (
                              <div>
                                <span style={{ textDecoration: 'line-through', color: '#888', marginRight: 6 }}>{match[2]}</span>
                                <span style={{ color: '#388e3c', fontWeight: 600 }}>{`Use a ${match[1]}-style alternative`}</span>
                              </div>
                            ) : <div>{issue.replace('[AI suggestion] ', '')}</div>;
                          } else if (typeof issue === 'string') {
                            improvedText = <div>{issue.replace('[AI suggestion] ', '')}</div>;
                          }
                          return (
                            <li key={i} style={{ marginBottom: 8, listStyle: 'none', borderLeft: isViolation ? '4px solid #e57373' : '4px solid #bdbdbd', background: isViolation ? '#fff6f6' : '#f7f7fa', padding: '8px 12px', borderRadius: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                                <span style={{ fontWeight: 500, color: isViolation ? '#d32f2f' : '#555', marginRight: 8 }}>{isViolation ? 'Must fix' : 'Suggestion'}</span>
                                {isViolation && <span style={{ fontSize: 11, color: '#d32f2f', background: '#ffeaea', borderRadius: 6, padding: '2px 6px', marginLeft: 6 }}>Violation</span>}
                                {!isViolation && <span style={{ fontSize: 11, color: '#555', background: '#eee', borderRadius: 6, padding: '2px 6px', marginLeft: 6 }}>Optional</span>}
                              </div>
                              {improvedText}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ));
                })()}
              </>
            ) : (
              <div style={{ color: '#388e3c', background: '#f6fff6', borderRadius: 8, padding: 12, marginTop: 8 }}>
                <strong>No compliance issues found for the selected elements.</strong>
                <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Your design is mostly compliant. Review for final approval.</div>
              </div>
            )}
            {/* NEW: Autofix button (only show when score < 100% and text issues exist) */}
            {(result.brandScore || 0) < 100 && result.textComplianceResults && result.textComplianceResults.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <Button
                  variant="secondary"
                  onClick={() => setShowFixes(!showFixes)}
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                >
                  {showFixes ? "Hide Autofix" : "Show Autofix"}
                </Button>
              </div>
            )}
          </div>
        )}
        {/* NEW: Autofix Panel (conditionally rendered) */}
        {showFixes && result && result.textComplianceResults && (
          <div style={{ marginTop: "16px", borderTop: "1px solid #e0e0e0", paddingTop: "16px" }}>
            <AutofixPanel
              textComplianceResults={result.textComplianceResults}
              brandProfile={brandProfile}
              sandboxProxy={sandboxProxy}
              onFixApplied={handleAnalyzeClick}
            />
          </div>
        )}
      </div>
    </Theme>
  );
}

export default App;



