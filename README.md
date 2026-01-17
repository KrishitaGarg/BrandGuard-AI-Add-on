<h1>BrandGuard AI – Adobe Express Add-On</h1>
<p><strong>AI-Powered Brand Compliance & Autofix using Model Context Protocol (MCP)</strong></p>

<hr />

<h2>Overview</h2>
<p>
BrandGuard AI is an <strong>Adobe Express Add-on</strong> that performs real-time brand compliance
analysis and provides <strong>Grammarly-style autofix suggestions</strong> directly on creative designs.
</p>

<p>
The system is built on a <strong>Model Context Protocol (MCP)</strong> backend, exposing brand governance
as structured, deterministic tools rather than a conversational chatbot.
</p>

<hr />

<h2>Problem</h2>
<p>
Design teams often ship visually polished assets that fail brand or legal review due to small but
critical issues such as:
</p>

<ul>
  <li>Disallowed or risky marketing claims</li>
  <li>Off-brand colors or fonts</li>
  <li>Missing headlines or calls-to-action</li>
  <li>Tone or industry compliance violations</li>
</ul>

<p>
Most existing tools only <em>flag</em> these issues, forcing designers into slow feedback and rework loops.
</p>

<hr />

<h2>Solution</h2>
<p>
BrandGuard AI detects brand violations <strong>inside Adobe Express</strong> and helps designers
<strong>fix them instantly</strong> without breaking creative flow.
</p>

<p>
Instead of blocking progress, BrandGuard AI provides actionable, explainable fixes that can be
applied or undone with a single click.
</p>

<hr />

<h2>Key Features</h2>

<ul>
  <li>
    <strong>Real-Time Brand Compliance</strong><br />
    Analyzes Adobe Express canvas data including text, colors, fonts, and layout.
  </li>
  <li>
    <strong>Grammarly-Style Auto-Fix (NEW)</strong><br />
    One-click fix suggestions generated dynamically from brand guidelines. All fixes are undoable.
  </li>
  <li>
    <strong>Deterministic Compliance Scoring</strong><br />
    Predictable and explainable compliance scores from 0–100.
  </li>
  <li>
    <strong>MCP-Based Architecture</strong><br />
    Backend logic exposed as structured MCP tools, not free-form AI responses.
  </li>
  <li>
    <strong>Database-Driven Rules (NEW)</strong><br />
    No hardcoded colors, fonts, or claims. Brand and industry standards come from data models.
  </li>
</ul>

<hr />

<h2>Architecture</h2>

<pre>
Adobe Express Add-on (React + TypeScript)
            ↓
Backend API (Node.js + Express)
            ↓
MCP Server (TypeScript)
  ├─ analyze_design
  ├─ score_compliance
  ├─ apply_fixes
  └─ validate_brand
            ↓
Compliance Engine (Pure Functions)
</pre>

<hr />

<h2>Tech Stack</h2>

<ul>
  <li><strong>Frontend:</strong> React, TypeScript, Vite</li>
  <li><strong>Backend:</strong> Node.js, Express</li>
  <li><strong>MCP Server:</strong> TypeScript</li>
  <li><strong>AI Layer:</strong> LLM-assisted (optional)</li>
  <li><strong>Platform:</strong> Adobe Express Add-on SDK</li>
</ul>

<hr />

<h2>Running Locally</h2>

<h3>Prerequisites</h3>
<ul>
  <li>Node.js 18+</li>
  <li>npm</li>
  <li>Adobe Express account</li>
</ul>

<h3>Setup</h3>

<pre>
cd backend
npm install

cd ../server
npm install

cd ../brandguard-express
npm install
</pre>

<h3>Environment Variables (Optional)</h3>

<pre>
PORT=3000
GEMINI_API_KEY=your_api_key_here
</pre>

<p>
Core compliance logic works without AI keys.
</p>

<h3>Start Services</h3>

<pre>
# Backend
cd backend && npm start
# http://localhost:3000

# MCP Server
cd server && npm run dev
# http://localhost:3001

# Adobe Express Add-on
cd brandguard-express && npm start
# https://localhost:5241
</pre>

<hr />

<h2>MCP Server</h2>

<p>
BrandGuard AI exposes functionality as <strong>structured MCP tools</strong>, ensuring deterministic and
explainable behavior.
</p>

<h3>Available Tools</h3>
<ul>
  <li>analyze_design</li>
  <li>score_compliance</li>
  <li>apply_fixes</li>
  <li>validate_brand</li>
</ul>

<hr />

<h2>Auto-Fix Workflow (NEW)</h2>

<ol>
  <li>Design is analyzed for brand violations</li>
  <li>Fix suggestions are generated from brand guidelines</li>
  <li>Designer reviews before / after values</li>
  <li>Fixes are applied directly to the canvas</li>
  <li>Compliance score improves on re-analysis</li>
</ol>

<p>
All fixes are data-driven, explainable, and undoable.
</p>

<hr />

<h2>Adobe Express Testing</h2>

<ol>
  <li>Open <a href="https://new.express.adobe.com">Adobe Express</a></li>
  <li>Enable development or local add-on mode</li>
  <li>Load the <code>brandguard-express</code> directory</li>
  <li>Create a non-compliant design</li>
  <li>Run <strong>Analyze Brand Compliance</strong></li>
  <li>Review issues and suggested fixes</li>
  <li>Apply fixes and re-analyze</li>
</ol>

<hr />

<h2>Why BrandGuard AI</h2>

<ul>
  <li>Moves beyond detection to action</li>
  <li>Uses MCP for enterprise-grade AI structure</li>
  <li>Deterministic and explainable results</li>
  <li>Embedded directly in the designer workflow</li>
  <li>Non-blocking and creativity-first</li>
</ul>

<hr />

<h2>Documentation</h2>

<ul>
  <li>MCP Server: <code>server/mcp/README.md</code></li>
  <li>Backend: <code>backend/README.md</code></li>
  <li>Adobe Express Add-on: <code>brandguard-express/README.md</code></li>
</ul>

<hr />

<h2>License</h2>
<p>
Private – BrandGuard AI<br />
Hackathon submission and prototype
</p>
