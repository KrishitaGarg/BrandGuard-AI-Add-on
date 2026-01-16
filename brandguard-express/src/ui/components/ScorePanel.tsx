import React from "react";

export interface ScorePanelProps {
  score: number;
  strengths: string[];
  summary: string;
}

const ScorePanel: React.FC<ScorePanelProps> = ({ score, strengths, summary }) => (
  <div style={{ border: "2px solid #4caf50", borderRadius: 8, padding: 16, marginBottom: 16, background: "#f9fff9" }}>
    <div style={{ fontSize: 22, fontWeight: 700, color: "#388e3c" }}>
      Compliance Score: {score}
    </div>
    <div style={{ margin: "8px 0" }}>
      <strong>Summary:</strong> {summary}
    </div>
    {strengths && strengths.length > 0 && (
      <div>
        <strong>Strengths:</strong>
        <ul>
          {strengths.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
    )}
  </div>
);

export default ScorePanel;
