// Adobe Express Add-on: UI Orchestration Layer (Side Panel)
// This file implements the UI logic for the add-on side panel, wiring user actions to the sandbox bridge.
// No frameworks, no direct document API access, no compliance/autofix logic here. All logic is invoked via messaging.
// All actions are explicit and user-triggered. No background or auto-run behavior.

// --- UI rendering helpers (vanilla JS, no frameworks) ---

function createButton(label, onClick) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.onclick = onClick;
  btn.className = 'brandguard-btn';
  return btn;
}

function createViolationCard(violation, fix) {
  const card = document.createElement('div');
  card.className = `violation-card severity-${violation.severity}`;
  card.innerHTML = `
    <div class="violation-rule">${violation.rule}</div>
    <div class="violation-explanation">${violation.explanation}</div>
    <div class="violation-current"><b>Current:</b> ${violation.current}</div>
    <div class="violation-expected"><b>Expected:</b> ${violation.expected}</div>
    <div class="violation-severity"><b>Severity:</b> ${violation.severity}</div>
  `;
  if (fix) {
    const fixBtn = createButton('Apply Fix', () => {
      // User-triggered: send fix request for this violation
      sendMessageToSandbox({ type: 'apply-fix', fix });
    });
    card.appendChild(fixBtn);
  }
  return card;
}

function renderScore(score) {
  const el = document.getElementById('compliance-score');
  el.textContent = `Compliance Score: ${score}/100`;
}

function renderViolations(violations, fixes) {
  const list = document.getElementById('violation-list');
  list.innerHTML = '';
  violations.forEach((v, i) => {
    const fix = fixes.find(f => f.property === v.rule.replace(/ /g, '').toLowerCase());
    list.appendChild(createViolationCard(v, fix));
  });
}

function renderFixAllButton(fixes) {
  const container = document.getElementById('fix-all-container');
  container.innerHTML = '';
  if (fixes && fixes.length) {
    const btn = createButton('Apply All Fixes', () => {
      // User-triggered: send all fixes
      sendMessageToSandbox({ type: 'apply-all-fixes', fixes });
    });
    container.appendChild(btn);
  }
}

// --- Messaging bridge (Adobe Express sandbox safe) ---

function sendMessageToSandbox(message) {
  // Use Adobe Express approved messaging bridge (e.g., window.parent.postMessage or provided API)
  // This function must be replaced with the actual bridge in production
  if (window.parent) {
    window.parent.postMessage({ source: 'brandguard-addon', ...message }, '*');
  }
}

function handleSandboxMessage(event) {
  // Only accept messages from the approved sandbox
  if (!event.data || event.data.source !== 'brandguard-sandbox') return;
  console.log("UI_RECEIVED", event.data);
  const { compliance, fixes } = event.data;
  if (compliance) {
    renderScore(compliance.score);
    renderViolations(compliance.violations, fixes || []);
    renderFixAllButton(fixes || []);
  }
}

// --- UI setup ---

document.addEventListener('DOMContentLoaded', () => {
  // Render static panel structure
  const root = document.getElementById('brandguard-root');
  root.innerHTML = `
    <div class="score-panel" id="compliance-score">Compliance Score: --</div>
    <div id="violation-list"></div>
    <div id="fix-all-container"></div>
    <div class="action-bar"></div>
  `;
  const actionBar = root.querySelector('.action-bar');
  // User actions
  actionBar.appendChild(createButton('Run Compliance Check', () => {
    // User-triggered: request compliance check from sandbox
    sendMessageToSandbox({ type: 'run-compliance-check' });
  }));
  // Listen for sandbox messages
  window.addEventListener('message', handleSandboxMessage);
});

// --- Styling (minimal, for clarity) ---
const style = document.createElement('style');
style.textContent = `
#brandguard-root { font-family: Inter, Arial, sans-serif; padding: 16px; }
.score-panel { font-size: 1.2em; margin-bottom: 12px; }
.violation-card { border: 1px solid #ccc; border-radius: 6px; padding: 10px; margin-bottom: 10px; background: #fff; }
.violation-card.severity-critical { border-color: #d32f2f; background: #fff5f5; }
.violation-card.severity-warning { border-color: #fbc02d; background: #fffbe5; }
.brandguard-btn { margin: 6px 4px 0 0; padding: 6px 14px; border-radius: 4px; border: none; background: #0057B8; color: #fff; cursor: pointer; font-size: 1em; }
.brandguard-btn:hover { background: #003e8a; }
.action-bar { margin-top: 18px; }
`;
document.head.appendChild(style);

/**
 * Adobe review notes:
 * - UI never accesses document APIs directly; all document actions are via explicit user-triggered messages to the sandbox.
 * - No compliance or autofix logic is run in the UI; all computation is sandbox-side.
 * - No background or auto-run actions; all flows are explicit and user-initiated.
 * - No frameworks, servers, or AI are used.
 */
