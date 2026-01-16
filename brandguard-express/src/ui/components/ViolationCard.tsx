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
}) => {
  const isViolation = severity === "critical" || severity === "warning";
  const isSuggestion = suggestion && suggestion.length > 0;
  let diffBlock = null;
  if (isSuggestion && suggestion.match(/Replace '(.+?)' with '(.+?)'/)) {
    const match = suggestion.match(/Replace '(.+?)' with '(.+?)'/);
    if (match) {
      diffBlock = (
        <div>
          <span style={{ textDecoration: 'line-through', color: '#888', marginRight: 6 }}>{match[1]}</span>
          <span style={{ color: '#388e3c', fontWeight: 600 }}>{match[2]}</span>
        </div>
      );
    }
  } else if (isSuggestion && suggestion.match(/Use a (.+?)-style alternative instead of '(.+?)'/)) {
    const match = suggestion.match(/Use a (.+?)-style alternative instead of '(.+?)'/);
    if (match) {
      diffBlock = (
        <div>
          <span style={{ textDecoration: 'line-through', color: '#888', marginRight: 6 }}>{match[2]}</span>
          <span style={{ color: '#388e3c', fontWeight: 600 }}>{`Use a ${match[1]}-style alternative`}</span>
        </div>
      );
    }
  }
  return (
    <div style={{ border: isViolation ? "2px solid #e57373" : "1px solid #bdbdbd", borderRadius: 6, padding: 12, marginBottom: 10, background: isViolation ? "#fff6f6" : "#f7f7fa" }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontWeight: 500, color: isViolation ? '#d32f2f' : '#555', marginRight: 8 }}>{isViolation ? 'Must fix' : 'Suggestion'}</span>
        {isViolation && <span style={{ fontSize: 11, color: '#d32f2f', background: '#ffeaea', borderRadius: 6, padding: '2px 6px', marginLeft: 6 }}>Violation</span>}
        {!isViolation && <span style={{ fontSize: 11, color: '#555', background: '#eee', borderRadius: 6, padding: '2px 6px', marginLeft: 6 }}>Optional</span>}
      </div>
      <div><strong>Type:</strong> {type} <strong>Severity:</strong> {severity}</div>
      <div><strong>Explanation:</strong> {explanation}</div>
      {diffBlock ? (
        <div style={{ marginTop: 6 }}>{diffBlock}</div>
      ) : isSuggestion ? (
        <div style={{ marginTop: 6, color: '#388e3c' }}>{suggestion}</div>
      ) : null}
      {onAutofix && (
        <button style={{ marginTop: 6 }} onClick={onAutofix}>
          {autofixLabel || "Apply Fix"}
        </button>
      )}
    </div>
  );
};

export default ViolationCard;
