# FinRecon AI — Agent Build Plan

A phased, dependency-ordered plan for building the multi-agent reconciliation system. Each phase is independently demoable, so you can stop at MVP, Strong, or Winning version depending on time.

---

## Phase 0 — Project Scaffolding (Day 1)

- [ ] Initialize `frontend/` (Vite + React + Tailwind) and `backend/` (Express) repos
- [ ] Set up MongoDB + Mongoose schemas (`UploadBatch`, `Transaction`, `AuditLog`)
- [ ] Configure `.env` files (see `agent_setup.md`)
- [ ] Set up basic Express server with health-check route
- [ ] Set up basic React app shell with routing (`/`, `/dashboard`, `/exceptions`, `/chat`, `/reports`)
- [ ] Generate synthetic dataset: 100 records with deliberate mix (70 matches, 10 mismatches, 5 missing bank, 5 missing payment, 4 delays, 3 duplicates, 3 unknown) → split 80 train/dev + 20 held-out eval

**Checkpoint:** Empty app runs end-to-end, backend and frontend talk to each other.

---

## Phase 1 — MVP: Deterministic Core (Days 2–4)

Goal: reconciliation works with **zero AI** — prove the deterministic foundation first.

### 1.1 Data Agent (rule-based schema mapping)
- [ ] `ingestionService.js` — parse CSV with papaparse
- [ ] `normalizer.js` — standardize amount formats (₹1,000 / 1000.00 / INR 1000 → 1000), date formats → ISO
- [ ] Hardcode column mapping first (payment.amount / bank.credit / order.order_amount) before adding AI mapping

### 1.2 Reconciliation Agent (exact match only)
- [ ] `matcher.js` — exact match on transaction ID across all 3 sources
- [ ] `confidenceScorer.js` — binary match/no-match to start
- [ ] Split results into `matched` vs `exceptions`

### 1.3 Exception Detection (rule-based, no explanation yet)
- [ ] `exceptionClassifier.js` — classify into: amount_mismatch, missing_settlement, unknown_credit, settlement_delay, duplicate
- [ ] `priorityEngine.js` — assign Critical/High/Medium/Low by amount thresholds

### 1.4 Dashboard (frontend)
- [ ] `FileUpload.jsx` — 3-file upload form
- [ ] `StatsCards.jsx` — total/matched/exceptions/match rate
- [ ] `ReconciliationChart.jsx` — bar chart of exception types (recharts)
- [ ] `ExceptionTable.jsx` — sortable/filterable table

**Checkpoint (MVP demo):** Upload 3 CSVs → see match rate + exception table with correct rule-based classifications. No AI involved yet.

---

## Phase 2 — Strong Version: Add Intelligence (Days 5–8)

### 2.1 Fuzzy Matching
- [ ] Integrate `fuzzball` / `string-similarity` for reference ID similarity
- [ ] Compute weighted confidence score:
  `score = w1*amount_sim + w2*reference_sim + w3*time_proximity + w4*description_sim`
- [ ] Add thresholds: ≥90% matched, 70–90% "likely match" (flagged), <70% exception
- [ ] Unit tests for matcher with edge cases (TXN_1042 vs UPI-1042 style references)

### 2.2 LLM Integration
- [ ] Build `llmClient.js` (centralized Anthropic API wrapper)
- [ ] `schemaPrompt.js` — AI-assisted column mapping (replaces hardcoded mapping from Phase 1)
- [ ] `exceptionExplainPrompt.js` — generates the "AI ANALYSIS" text + recommended action per exception
- [ ] Wire `exceptionAgent.js` to call LLM only *after* deterministic classification is done — AI explains, never re-decides the classification

### 2.3 Transaction Detail Page
- [ ] `TransactionDetailPage.jsx` — payment/bank/order side-by-side view
- [ ] Render AI explanation + recommended action + confidence %

### 2.4 Priority Dashboard
- [ ] `PriorityBadges.jsx` — Critical/High/Medium/Low counts on dashboard
- [ ] Filter exception table by priority

**Checkpoint (Strong demo):** Fuzzy-matched transactions correctly flagged, each exception has a readable AI explanation and recommended action, priorities visible.

---

## Phase 3 — Winning Version: Autonomy + Trust (Days 9–14)

### 3.1 Full Agent Pipeline
- [ ] Implement `plannerAgent.js` to orchestrate Data → Reconciliation → Exception → Reporting agents as one autonomous pipeline (single "Reconcile" trigger, no manual button-per-step)
- [ ] Add `ProcessingAnimation.jsx` showing live pipeline stages ("Analyzing schema...", "Reconciling 100 transactions...", etc.)

### 3.2 Natural-Language Chat ("Ask Finance Controller")
- [ ] `nlQueryEngine.js` — takes user question + queries `Transaction` table for relevant rows → passes structured context to Claude → returns grounded natural-language answer (not free-form guessing)
- [ ] `ChatWindow.jsx` — chat UI, sample queries: "Why is today's reconciliation rate low?", "Show me transactions above ₹10,000 that failed", "What's the biggest exception?"

### 3.3 Reporting Agent
- [ ] `reportPrompt.js` — generates "Daily Reconciliation Summary" narrative
- [ ] `exportService.js` — PDF (pdfkit) and CSV (json2csv) export
- [ ] `ReportsPage.jsx` — "Generate Finance Summary" button + download

### 3.4 PDF Ingestion
- [ ] Extend `ingestionService.js` with `pdf-parse` for bank statements that come as PDF
- [ ] Fallback gracefully if PDF layout can't be parsed — flag as "manual review needed" rather than silently failing

### 3.5 Audit Trail
- [ ] `auditService.js` — log every agent action (schema mapping decision, match/no-match, AI explanation generated, report exported) to `AuditLog` table
- [ ] Simple audit log viewer (admin-only page)

### 3.6 Held-Out Evaluation
- [ ] `tests/eval/runEval.js` — run pipeline against the 20-record held-out set
- [ ] `metrics.js` — compute match accuracy, exception-detection precision/recall
- [ ] Output a clean report:
  ```
  Total test records: 20
  Correctly matched: 18
  Incorrect: 2
  Match accuracy: 90%
  ```
- [ ] Add this eval output to the pitch deck as evidence, not just a demo claim

**Checkpoint (Winning demo):** Full autonomous flow from upload → dashboard → exception drill-down → chat query → report generation, backed by a measured accuracy number from the held-out set.

---

## Phase 4 — Polish & Demo Prep (Days 15–16)

- [ ] Write `docs/demo_script.md` — scene-by-scene walkthrough (matches the 8-scene flow in `project.md`)
- [ ] Seed a clean, realistic demo dataset (avoid obviously synthetic-looking numbers)
- [ ] Add loading states / empty states across all pages
- [ ] Error handling: LLM call failure should degrade gracefully (classification still shows, explanation says "unavailable")
- [ ] Record a 2–3 min demo video as backup in case live demo fails
- [ ] Prepare answer to "Why do you need AI here?" (see `project.md` §7)

---

## Suggested Order of Priority If Time-Constrained

If you only have limited time, build in this exact order — each step is independently demoable:

1. Exact matching + dashboard (Phase 1) — **always do this first**
2. Fuzzy matching (Phase 2.1) — biggest "wow" jump for matching quality
3. AI exception explanations (Phase 2.2) — biggest "wow" jump for perceived intelligence
4. Held-out evaluation (Phase 3.6) — biggest credibility jump with judges
5. Chat interface (Phase 3.2) — nice demo moment but lowest priority if time runs out
6. PDF ingestion, audit trail, full report export — stretch goals

---

## Definition of Done (per agent)

| Agent | Done when... |
|---|---|
| Data Agent | Correctly maps and normalizes 3 differently-formatted CSVs without hardcoded column names |
| Reconciliation Agent | Produces a confidence score for every transaction, exact + fuzzy paths both tested |
| Exception Agent | Every exception has a classification, priority, AI explanation, and recommended action |
| Reporting Agent | Produces both a dashboard-ready summary object and a downloadable PDF/CSV |
| Planner Agent | Single API call triggers the entire pipeline end-to-end with no manual intermediate steps |
