import React from "react";

export interface ScorePanelProps {
  score: number;
}

const ScorePanel: React.FC<ScorePanelProps> = ({ score }) => (
  <div style={{ border: "2px solid #4caf50", borderRadius: 8, padding: 16, marginBottom: 16, background: "#f9fff9" }}>
    <div style={{ fontSize: 22, fontWeight: 700, color: "#388e3c" }}>
      Compliance Score: {score}
    </div>
  </div>
);

export default ScorePanel;
