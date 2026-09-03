# FinRecon AI — Project Overview

## One-line idea
An AI agent that automatically reconciles transactions across a payment gateway, bank statement, and internal orders database, identifies mismatches, explains *why* they happened, and generates an actionable exception report.

> "Finance team ka manual reconciliation ka kaam AI agent automatically karega."

---

## 1. The Problem

A merchant's transaction data typically lives in three disconnected sources:

| Source | Example |
|---|---|
| Payment Gateway | TXN001 → ₹500, TXN002 → ₹1,200 |
| Bank Statement | TXN001 → ₹500, TXN003 → ₹700 |
| Orders Database | TXN001 → ₹500, TXN002 → ₹1,000 |

A finance employee manually cross-checks these three sources to answer:
- Do amounts match?
- Did the transaction actually settle?
- Is anything missing?
- Are there duplicates?
- Were fees deducted or refunds issued?
- Was settlement delayed?

This is manageable for 50–100 records but becomes a nightmare at thousands/millions of records.

---

## 2. The Solution

An **AI Finance Controller** — not just a CSV diffing tool. It performs:

1. **Data ingestion** — accepts CSV/PDF from all three sources
2. **Schema mapping** — AI identifies which columns correspond to amount, ID, date, etc. across differently-named files
3. **Normalization** — standardizes currency formats, date formats, and text
4. **Matching** — exact + fuzzy matching with a confidence score per transaction
5. **Exception detection** — flags anything that doesn't match confidently
6. **AI explanation** — explains *why* each exception occurred in plain language
7. **Recommended action** — suggests the next step for a human to take
8. **Reporting** — generates a downloadable, auditable reconciliation report
9. **Conversational interface** — "Ask your books" natural-language Q&A over the results

**Core principle:** AI is never used for arithmetic. Deterministic code does all financial calculations; AI handles reasoning, classification, and explanation.

```
Deterministic code → financial calculations
AI                 → reasoning / classification / explanation
```

The system remains **human-in-the-loop** — it never auto-executes refunds or transfers.

---

## 3. Exception Categories

| Status | Meaning |
|---|---|
| 🟢 Matched | All three sources agree |
| ⚠️ Amount Mismatch | Amounts differ across sources |
| ⚠️ Settlement Delay | Settlement time exceeds expected window |
| 🔴 Missing Settlement | Payment/order exists but bank entry missing |
| 🔴 Unknown Credit | Bank entry with no matching payment/order |
| 🔁 Duplicate | Same transaction appears more than once |

## 4. Priority Levels

| Priority | Amount Range |
|---|---|
| 🔴 Critical | ₹50,000+ |
| 🟠 High | ₹10,000 – ₹50,000 |
| 🟡 Medium | ₹1,000 – ₹10,000 |
| 🟢 Low | < ₹1,000 |

---

## 5. Tech Stack (React + Node.js)

| Layer | Choice |
|---|---|
| Frontend | React (Vite) + Tailwind CSS + Recharts |
| Backend | Node.js + Express |
| Database | MongoDB (via Mongoose) |
| File parsing | papaparse (CSV), pdf-parse (PDF) |
| Fuzzy matching | fuzzball / string-similarity |
| File upload | multer |
| Report generation | pdfkit |
| AI | Anthropic API (Claude) |

---

## 6. Build Levels

**MVP**
- 3 CSV upload
- Normalization
- Exact matching
- Exception detection
- Match-rate dashboard

**Strong Version**
- Fuzzy matching
- Confidence scores
- AI exception explanations
- Priority ranking
- Natural-language finance assistant

**Winning Version**
- CSV + PDF ingestion
- Full autonomous agent workflow
- Human approval loop
- Audit trail
- Held-out evaluation set (accuracy reporting)
- Downloadable reconciliation report
- "Ask your books" conversational interface

---

## 7. Positioning

**FinRecon AI — Your autonomous finance controller.**

> FinRecon AI reconciles payment, bank, and order records, identifies mismatches, explains unresolved exceptions, and tells finance teams what needs attention — turning hours of manual reconciliation into an auditable AI-assisted workflow.

**Tagline:** *"Don't just close the books. Understand them."*

### Answering "Why do you need AI?"
> "Deterministic rules handle obvious matches, but real-world financial records are messy. Our AI controller handles schema variations, ambiguous references, fuzzy transaction matching, exception classification, explanation, and natural-language investigation — while deterministic validation ensures financial accuracy."
