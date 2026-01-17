BrandGuard AI – Adobe Express Add-On

AI-Powered Brand Compliance & Autofix using MCP

BrandGuard AI is an Adobe Express Add-on that performs real-time brand compliance analysis and provides Grammarly-style autofix suggestions directly on creative designs.

It is built on a Model Context Protocol (MCP) server, exposing brand governance as structured, deterministic tools rather than a chatbot.

Overview

Design teams often ship assets that look visually correct but fail brand or legal checks due to:

Disallowed claims

Off-brand colors or fonts

Missing headlines or CTAs

Tone or industry compliance issues

BrandGuard AI detects these issues inside Adobe Express and helps designers fix them instantly, without breaking creative flow.

Key Features

Real-Time Brand Compliance
Analyzes Adobe Express canvas data (text, colors, fonts, layout)

Grammarly-Style Auto-Fix (NEW)
One-click fix suggestions generated dynamically from brand guidelines
All fixes are undoable

Deterministic Scoring
Predictable, explainable compliance scores (0–100)

MCP-Based Architecture
Backend implemented as an MCP-compatible server with structured tools

Database-Driven Rules (NEW)
No hardcoded colors, fonts, or claims
Brand and industry rules come from data models

Architecture
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

Tech Stack

Frontend: React, TypeScript, Vite

Backend: Node.js, Express

MCP Server: TypeScript

AI Layer: LLM-assisted (optional)

Platform: Adobe Express Add-on SDK

Running Locally
Prerequisites

Node.js 18+

npm

Adobe Express account

Setup
# Install backend
cd backend
npm install

# Install MCP server
cd ../server
npm install

# Install add-on
cd ../brandguard-express
npm install

Environment Variables (Optional)

backend/.env

PORT=3000
GEMINI_API_KEY=your_api_key_here


Core compliance logic works without AI keys.

Start Services (3 Terminals)
# Backend
cd backend && npm start
# http://localhost:3000

# MCP Server
cd server && npm run dev
# http://localhost:3001

# Adobe Express Add-on
cd brandguard-express && npm start
# https://localhost:5241

MCP Server

BrandGuard AI exposes functionality as structured MCP tools, not conversational prompts.

Available Tools

analyze_design

score_compliance

apply_fixes

validate_brand

Example Invocation
POST http://localhost:3001/mcp/invoke

Auto-Fix Workflow (NEW)

Design is analyzed for violations

Fix suggestions are generated from brand rules

Designer reviews fixes (before / after)

Fixes are applied to the Adobe Express canvas

Compliance score improves on re-analysis

All fixes are:

Data-driven

Explainable

Undoable

Adobe Express Testing

Open https://new.express.adobe.com

Enable local add-on / development mode

Load brandguard-express

Create a non-compliant design

Run Analyze Brand Compliance

View issues and suggested fixes

Apply fixes → Re-analyze

Why BrandGuard AI

Goes beyond flagging → fixing

Uses MCP for enterprise-grade AI structure

Deterministic and explainable

Built directly into the designer workflow

Zero disruption to creativity

Documentation

MCP Docs: server/mcp/README.md

Backend Docs: backend/README.md

Add-on Docs: brandguard-express/README.md
