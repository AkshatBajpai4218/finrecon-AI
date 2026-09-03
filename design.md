# FinRecon AI — System Design

Stack: **React (Vite) + Tailwind** frontend, **Node.js + Express** backend, **MongoDB (via Mongoose)** database, **Claude (Anthropic API)** for reasoning.

---

## 1. High-Level Architecture

```
                 ┌─────────────────┐
                 │ Payment Gateway │
                 │      CSV        │
                 └────────┬────────┘
                          │
                          ▼
┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│ Bank         │───►│   FINRECON    │◄───│ Orders DB    │
│ Statement    │    │   AI AGENT    │    │    CSV       │
│ CSV/PDF      │    └───────┬───────┘    └──────────────┘
└──────────────┘            │
                            ▼
                 ┌────────────────────┐
                 │ Transaction         │
                 │ Matching Engine     │
                 └─────────┬──────────┘
                           │
                ┌──────────┴───────────┐
                ▼                      ▼
         ✅ MATCHED              ⚠️ EXCEPTIONS
                │                      │
                ▼                      ▼
       Reconciliation          AI Explanation
          Report                    │
                                   ▼
                             Recommended Action
```

## 2. Agent Architecture

```
                 Finance Controller Agent
                           │
                           ▼
                  ┌─────────────────┐
                  │ Planner / Router│
                  └────────┬────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
 Data Agent          Reconciliation       Exception
                     Agent                 Agent
       │                   │                   │
       ▼                   ▼                   ▼
Normalize          Match transactions     Explain issues
columns             calculate score       classify issue
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
                    Reporting Agent
                           │
                           ▼
                  Final Finance Report
```

| Agent | Responsibility | Uses AI? |
|---|---|---|
| Planner Agent | Routes the workflow, decides next step | Light AI (routing) |
| Data Agent | Detects schema, maps columns, normalizes values | AI (schema mapping) |
| Reconciliation Agent | Runs exact + fuzzy matching, computes confidence scores | No AI (deterministic) |
| Exception Agent | Classifies exception type, generates plain-language explanation & recommended action | AI (explanation) |
| Reporting Agent | Aggregates results into summary + downloadable report | AI (summary generation) |

**Golden rule:** AI never performs arithmetic. All ₹ calculations happen in deterministic Node.js code (`core/`). AI only reasons over already-computed results (`llm/`).

---

## 3. Request/Data Flow

```
1. User uploads payment.csv, bank.csv, orders.csv
2. Data Agent → detects schema → maps columns → normalizes amounts/dates
3. Reconciliation Agent → exact match pass → fuzzy match pass → confidence score per txn
4. Split into MATCHED vs EXCEPTIONS
5. Exception Agent → classify each exception → generate AI explanation → recommend action
6. Priority Engine → assign Critical/High/Medium/Low
7. Reporting Agent → generate dashboard stats + downloadable report
8. Results persisted to MongoDB
9. Frontend polls/fetches results → renders dashboard
10. User can chat with "Ask Finance Controller" for natural-language queries
```

---

## 4. Database Schema (MongoDB / Mongoose)

```js
// models/uploadBatch.model.js
const uploadBatchSchema = new Schema({
  createdAt:   { type: Date, default: Date.now },
  paymentFile: { type: String, required: true },
  bankFile:    { type: String, required: true },
  orderFile:   { type: String, required: true },
  status:      { type: String, enum: ['processing', 'completed', 'failed', 'needs_manual_review'], default: 'processing' },
});
// transactions are referenced via batchId, not embedded, since a batch
// can have hundreds of transactions and we query/filter them independently.

// models/transaction.model.js
const transactionSchema = new Schema({
  batchId:           { type: Schema.Types.ObjectId, ref: 'UploadBatch', required: true, index: true },
  txnRef:            { type: String, required: true },
  paymentAmount:      Number,
  bankAmount:         Number,
  orderAmount:        Number,
  paymentTime:        Date,
  bankTime:           Date,
  orderTime:          Date,
  status: {
    type: String,
    enum: ['matched', 'mismatch', 'missing_settlement', 'unknown_credit', 'delay', 'duplicate'],
    required: true,
    index: true,
  },
  confidence:         { type: Number, required: true },
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    index: true,
  },
  explanation:        String,
  recommendedAction:  String,
  createdAt:          { type: Date, default: Date.now },
});

// models/auditLog.model.js
const auditLogSchema = new Schema({
  batchId:     { type: Schema.Types.ObjectId, ref: 'UploadBatch', required: true, index: true },
  action:      { type: String, required: true },
  performedBy: { type: String, required: true },
  timestamp:   { type: Date, default: Date.now },
  details:     Schema.Types.Mixed,
});
```

**Notes on the MongoDB design:**
- `batchId` is stored as a reference (`ObjectId`), not an embedded array, so the Exceptions page can query/filter/sort transactions independently without loading the whole batch document.
- Indexes on `batchId`, `status`, and `priority` keep the dashboard and exception-table queries fast as transaction volume grows.
- `details` in `AuditLog` uses `Schema.Types.Mixed` since audit payloads vary by action type (schema-mapping decision, AI explanation generated, report exported, etc.).

---

## 5. API Design (Express Routes)

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/upload` | Upload 3 files, create UploadBatch |
| POST | `/api/reconcile/:batchId` | Trigger reconciliation pipeline |
| GET | `/api/reconcile/:batchId/status` | Poll processing status |
| GET | `/api/exceptions/:batchId` | List all exceptions (filterable by priority/status) |
| GET | `/api/transactions/:txnId` | Transaction detail with AI explanation |
| POST | `/api/chat` | Natural-language query over reconciliation results |
| GET | `/api/reports/:batchId` | Generate/download PDF/CSV report |
| GET | `/api/eval/run` | Run held-out evaluation set, return accuracy metrics |

---

## 6. Matching Engine Design

**Step 1 — Exact match:** transaction ID / reference ID identical across sources.

**Step 2 — Fuzzy match (when exact fails):**
```
score = w1 * amount_similarity
      + w2 * reference_similarity (Levenshtein/Jaro-Winkler)
      + w3 * timestamp_proximity
      + w4 * description_similarity
```
- Weights tuned so amount + reference dominate.
- Confidence ≥ 90% → treated as matched.
- Confidence 70–90% → "likely match", flagged for review.
- Confidence < 70% → exception.

**Step 3 — Classification rules (deterministic, post-matching):**
| Condition | Classification |
|---|---|
| All 3 amounts equal, times within SLA | Matched |
| Amounts differ | Amount Mismatch |
| Bank entry missing | Missing Settlement |
| Bank entry with no payment/order | Unknown Credit |
| Settlement time > 2 hrs from payment | Settlement Delay |
| Same ref/amount appears twice | Duplicate |

---

## 7. Frontend UI Design

### Dashboard
```
FINRECON AI
────────────────────────────────
Total Transactions   100
Matched                86
Exceptions             14
Match Rate            86%
High Priority           4

Reconciliation Status
█████████████████ 86 Matched
████               9 Amount mismatch
███                3 Missing settlement
██                 2 Unknown
```

### Exception Table
| ID | Amount | Status | Confidence | Action |
|---|---|---|---|---|
| TXN102 | ₹1,200 | ⚠️ Mismatch | 98% | Review |
| TXN103 | ₹800 | 🔴 Missing | 96% | Investigate |

### Transaction Detail Page
```
Transaction TXN102
────────────────────────
PAYMENT   ₹1,200  10:32 AM  ✓ Successful
BANK      ₹1,200  10:35 AM  ✓ Settled
ORDER     ₹1,000  10:31 AM  ✓ Found
────────────────────────
⚠️ RECONCILIATION EXCEPTION
Difference: ₹200

AI ANALYSIS
The payment and bank settlement match, but the order
amount is ₹200 lower.

Possible causes:
• Order modification
• Additional charge
• Incorrect order record

RECOMMENDED ACTION
Review order adjustment history.
Confidence: 97%
```

### Chat Panel — "Ask Finance Controller"
Sidebar chat where users ask things like *"Show me transactions above ₹10,000 that failed reconciliation"* and get natural-language answers grounded in the batch's actual data (RAG over the Transaction table, not free-form LLM guessing).

---

## 8. Design Principles

1. **Determinism first, AI second** — every ₹ figure the user sees is computed by code, never by the LLM.
2. **Explainability over black-box scores** — every exception has a human-readable "why," not just a status code.
3. **Human-in-the-loop always** — no auto-transfers, no auto-refunds; AI only recommends.
4. **Auditability** — every agent action and AI explanation is logged to `AuditLog` for compliance review.
5. **Graceful degradation** — if the LLM call fails, exceptions still surface with their deterministic classification; only the natural-language explanation is missing.
