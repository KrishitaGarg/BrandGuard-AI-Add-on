import React from "react";

export interface ScorePanelProps {
  score: number;
}

const getDescriptor = (score: number) => {
  if (score >= 90) return { text: "Mostly compliant", color: "#388e3c" };
  if (score >= 70) return { text: "Needs review", color: "#fbc02d" };
  return { text: "High risk", color: "#d32f2f" };
};

const ScorePanel: React.FC<ScorePanelProps> = ({ score }) => {
  const descriptor = getDescriptor(score);
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      borderRadius: 10,
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
      padding: '12px 18px',
      background: '#fff',
      minWidth: 0,
      marginBottom: 16,
      border: `1.5px solid ${descriptor.color}`,
      gap: 16
    }}>
      <div style={{
        width: 54,
        height: 54,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${descriptor.color} 60%, #e0e0e0 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 0 0 4px ${descriptor.color}22`,
        fontSize: 24,
        fontWeight: 800,
        color: '#fff',
        flexShrink: 0
      }}>
        {score}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#222', marginBottom: 2 }}>Compliance Score</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: descriptor.color }}>{descriptor.text}</div>
      </div>
      <div style={{ marginLeft: 8, cursor: 'pointer', position: 'relative' }} title="Score is calculated based on your brand rules. It is deterministic and rule-based, not AI or random. Higher scores mean fewer violations.">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: 'middle' }}>
          <circle cx="12" cy="12" r="12" fill="#e0e0e0"/>
          <text x="12" y="16" textAnchor="middle" fontSize="14" fill="#388e3c">i</text>
        </svg>
      </div>
    </div>
  );
};

export default ScorePanel;
