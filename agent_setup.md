# FinRecon AI — Agent Setup Guide

This document covers environment setup, dependencies, and configuration needed to run the multi-agent reconciliation system (React + Node.js stack).

---

## 1. Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 18.x |
| npm / pnpm | latest |
| MongoDB | ≥ 6.0 |
| Anthropic API key | required for LLM calls |

---

## 2. Repository Structure (relevant to agents)

```
backend/
├── src/
│   ├── agents/
│   │   ├── plannerAgent.js
│   │   ├── dataAgent.js
│   │   ├── reconciliationAgent.js
│   │   ├── exceptionAgent.js
│   │   └── reportingAgent.js
│   ├── core/                 # deterministic logic, no AI
│   ├── llm/
│   │   ├── llmClient.js
│   │   ├── prompts/
│   │   └── nlQueryEngine.js
│   └── ...
```

---

## 3. Environment Variables

Create `backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/finrecon

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
ANTHROPIC_MODEL=claude-sonnet-4-6

# Matching thresholds
MATCH_CONFIDENCE_THRESHOLD=0.90
LIKELY_MATCH_THRESHOLD=0.70
SETTLEMENT_SLA_HOURS=2

# File upload
MAX_FILE_SIZE_MB=10
UPLOAD_DIR=./uploads
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 4. Backend Dependencies

```bash
cd backend
npm init -y

# Core
npm install express cors dotenv multer

# Database
npm install mongoose

# File parsing
npm install papaparse pdf-parse

# Fuzzy matching
npm install fuzzball string-similarity

# Report generation
npm install pdfkit json2csv

# LLM client
npm install axios

# Dev
npm install --save-dev nodemon jest supertest
```

`package.json` scripts:
```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "jest",
    "eval": "node tests/eval/runEval.js"
  }
}
```

---

## 5. Frontend Dependencies

```bash
cd frontend
npm create vite@latest . -- --template react
npm install

# Styling
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Data & UI
npm install axios recharts react-router-dom
npm install lucide-react   # icons
```

---

## 6. Database Setup

MongoDB has no migrations to run — schemas are defined directly in Mongoose model files (`src/models/`). Just make sure MongoDB is running and reachable at `MONGODB_URI`.

`src/db/connection.js`:
```js
const mongoose = require('mongoose');

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
}

module.exports = { connectDB };
```

Call `connectDB()` once at startup in `src/server.js` before the app starts listening.

Verify connection:
```bash
mongosh "mongodb://localhost:27017/finrecon" --eval "db.runCommand({ ping: 1 })"
```
Or use **MongoDB Compass** (GUI) to browse collections visually — closest equivalent to Prisma Studio.

---

## 7. LLM Client Setup (`src/llm/llmClient.js`)

```js
const axios = require('axios');

async function callClaude(systemPrompt, userMessage, maxTokens = 1000) {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: process.env.ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    }
  );
  return response.data.content.map((c) => c.text || '').join('\n');
}

module.exports = { callClaude };
```

> Note: keep this as the **only** file in the codebase that talks to the Anthropic API directly. Every agent imports from here so prompts, retries, and error handling stay centralized.

---

## 8. Agent Registration Pattern

Each agent is a plain async function with a consistent interface so the Planner can call them uniformly:

```js
// src/agents/dataAgent.js
async function runDataAgent({ paymentFile, bankFile, orderFile }) {
  // 1. parse files
  // 2. detect schema (AI-assisted via llm/schemaPrompt.js)
  // 3. normalize amounts/dates
  return { normalizedPayment, normalizedBank, normalizedOrder };
}

module.exports = { runDataAgent };
```

Planner orchestrates them in sequence:

```js
// src/agents/plannerAgent.js
const { runDataAgent } = require('./dataAgent');
const { runReconciliationAgent } = require('./reconciliationAgent');
const { runExceptionAgent } = require('./exceptionAgent');
const { runReportingAgent } = require('./reportingAgent');

async function runPipeline(batchId, files) {
  const normalized = await runDataAgent(files);
  const { matched, exceptions } = await runReconciliationAgent(normalized);
  const classifiedExceptions = await runExceptionAgent(exceptions);
  const report = await runReportingAgent({ matched, classifiedExceptions });
  return { matched, exceptions: classifiedExceptions, report };
}

module.exports = { runPipeline };
```

---

## 9. Running the System Locally

Terminal 1 — Database:
```bash
# ensure MongoDB is running locally, or via Docker:
docker run --name finrecon-mongo -p 27017:27017 -d mongo:6
```

Terminal 2 — Backend:
```bash
cd backend
npm run dev
```

Terminal 3 — Frontend:
```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173`.

---

## 10. Verifying the Setup

1. Upload the three sample CSVs from `data/raw/`.
2. Confirm `/api/upload` returns a `batchId`.
3. Call `/api/reconcile/:batchId` and confirm status moves to `completed`.
4. Check `/api/exceptions/:batchId` returns a non-empty exception list with `explanation` fields populated (confirms LLM connectivity).
5. Run `npm run eval` in backend to confirm the held-out evaluation script produces a match-accuracy percentage.

If step 4 returns exceptions without explanations, check `ANTHROPIC_API_KEY` and network connectivity — the deterministic classification should still work even if AI explanation fails (graceful degradation, see design.md §8).
