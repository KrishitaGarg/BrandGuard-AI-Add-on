import React from "react";

export interface ViolationCardProps {
  type: string;
  severity: string;
  explanation: string;
  suggestion: string;
  autofixLabel?: string;
  onAutofix?: () => void;
}

const ViolationCard: React.FC<ViolationCardProps> = ({
  type,
  severity,
  explanation,
  suggestion,
  autofixLabel,
  onAutofix,
}) => (
  <div style={{ border: "1px solid #ccc", borderRadius: 6, padding: 12, marginBottom: 10, background: "#fff" }}>
    <div><strong>Type:</strong> {type} <strong>Severity:</strong> {severity}</div>
    <div><strong>Explanation:</strong> {explanation}</div>
    <div><strong>Suggestion:</strong> {suggestion}</div>
    {onAutofix && (
      <button style={{ marginTop: 6 }} onClick={onAutofix}>
        {autofixLabel || "Apply Fix"}
      </button>
    )}
  </div>
);

export default ViolationCard;
