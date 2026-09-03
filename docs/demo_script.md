# FinRecon AI — 3-Minute Live Demo Script

An 8-scene rehearsable walkthrough showcasing the end-to-end Autonomous Financial Controller.

- **Target Duration:** 2 minutes 45 seconds
- **Presenter Role:** Finance Operations Lead / FinRecon Product Specialist
- **Pre-requisite:** Backend running (`npm run dev` in `backend`) & Frontend running (`http://localhost:5173`)

---

### Scene 1: Upload 3 Messy Data Sources (0:00 – 0:25)
- **On-Screen Action:** Navigate to `http://localhost:5173/dashboard`. In the "Upload Transaction Data" card, click the three file pickers and select:
  1. Payment Gateway: `data/synthetic/train_dev_set/payment_gateway.csv`
  2. Bank Statement: `data/synthetic/train_dev_set/bank_statement.csv`
  3. Orders Database: `data/synthetic/train_dev_set/orders.csv`
  Click **"Start Reconciliation Pipeline →"**.
- **Spoken Narration:**
  > *"Welcome to FinRecon AI. Today, finance teams waste hundreds of hours manually cross-referencing messy CSVs from Razorpay, bank statements with cryptic narrations, and internal order databases. Notice how these files have inconsistent headers, mixed date formats like DD/MM/YY versus ISO, and messy currency strings with rupee symbols and commas. With a single click, our autonomous multi-agent pipeline takes over."*
- **Expected Result:** Button switches immediately to the live animated processing controller card.

---

### Scene 2: AI Schema Detection Animation (0:25 – 0:45)
- **On-Screen Action:** Observe the `ProcessingAnimation` checklist dynamically activating with glowing green checkmarks.
- **Spoken Narration:**
  > *"Right now, our Data Agent is reading sample rows and using fast LLM intelligence to infer schema mappings on the fly. It accurately identifies which column is the monetary amount, which is the reference ID, and which is the timestamp—without ever hallucinating or modifying the underlying numerical values. Normalizer functions standardize all currencies and timestamps into strict ISO standards."*
- **Expected Result:**
  - `✓ Payment gateway schema detected & verified`
  - `✓ Bank statement schema & transactions mapped`
  - `✓ Orders database schema & line items parsed`

---

### Scene 3: Reconciliation Engine Execution (0:45 – 1:05)
- **On-Screen Action:** The animation transitions to `"Executing exact & fuzzy multi-way matching engine..."` and `"AI Exception Agent diagnosing root causes..."`.
- **Spoken Narration:**
  > *"Next, the Reconciliation Agent runs a 3-way matching pass within a 2-hour settlement SLA. For records with messy reference typos—like `TXN_1042` versus `UPI-1042`—our weighted fuzzy matching algorithm uses Dice coefficients to prevent false-alarm breaks. Finally, the Exception Agent classifies any true discrepancies and computes financial exposure."*
- **Expected Result:** Animated sequence completes with a success sound/badge, and automatically redirects to the Dashboard.

---

### Scene 4: Dashboard Reveal & Executive Metrics (1:05 – 1:30)
- **On-Screen Action:** Scroll through the newly populated Dashboard displaying 5 Stats Cards, the horizontal Recharts bar chart, and the Priority Exposure badges.
- **Spoken Narration:**
  > *"Instantly, the CFO has an executive-grade command center. Across our 80 transactions, we see an automated match rate of 87.5%, with matched settlements totaling over ₹11 Lakhs. The horizontal breakdown chart immediately isolates where our breaks are coming from: 8 amount mismatches, 4 missing bank entries, and 3 settlement delays. Below that, our Priority Engine highlights 3 Critical and 5 High-priority items that require immediate merchant attention."*
- **Expected Result:**
  - Stats Cards: Total, Matched, Exceptions, Match Rate %, High Priority Exposure.
  - Horizontal bar chart showing exact counts for each discrepancy type.
  - Priority pills: Critical (Red), High (Orange), Medium (Amber), Low (Green).

---

### Scene 5: Priority Exception Triage (1:30 – 1:50)
- **On-Screen Action:** In the Exception Table, click the **"Critical"** filter button, then click the **"High"** filter button.
- **Spoken Narration:**
  > *"Rather than drowning in 15 random rows, finance operators can triage by financial risk. Clicking 'Critical' isolates our largest exposures—like missing settlements above ₹30,000. Operators can toggle between amount mismatches, unknown credits, and settlement delays with zero lag."*
- **Expected Result:** Table instantly filters rows with subtle CSS transitions, displaying transaction ID, exposure amount (e.g., ₹50,000), status badge, and confidence percentage.

---

### Scene 6: Deep-Dive & AI Root Cause Diagnostics (1:50 – 2:15)
- **On-Screen Action:** Click on any exception row (e.g., `TXN1002` or `TXN1058`) to open the **Transaction Detail Page** (`/exceptions/:txnId`).
- **Spoken Narration:**
  > *"Clicking into an exception opens the 3-source forensic breakdown. At a glance, we compare Payment Gateway (₹2,000), Bank Statement (₹2,000), and Orders (₹2,500). Notice the AI Exception Analysis panel below: powered by high-speed Groq intelligence, it provides a plain-language root cause—explaining that an unapplied promotional coupon caused the ₹500 order break—and provides an exact, actionable next step for the ledger team."*
- **Expected Result:**
  - 3 side-by-side cards (Payment, Bank, Order) with green checkmarks or red crosses.
  - Dark AI Analysis panel showing 90%+ confidence score, root cause explanation, and recommended action.

---

### Scene 7: "Ask Your Books" Natural Language Chat (2:15 – 2:35)
- **On-Screen Action:** Click the **"Ask Your Books"** tab in the navbar (`/chat`). Click the suggestion: `"What is the biggest exception?"`, then press **Ask AI →**.
- **Spoken Narration:**
  > *"Finance teams can literally speak to their books. Let's ask: 'What is the biggest exception?' FinRecon AI uses heuristic retrieval over live MongoDB records, feeding grounded context to our 120-Billion parameter Groq model. In under 300 milliseconds, it identifies the exact transaction reference, the exposure amount, and the root cause—completely hallucination-free."*
- **Expected Result:** Assistant responds immediately with the exact transaction reference (e.g., `TXN-20260901-003`), exact ₹ amount, and operational context.

---

### Scene 8: Executive Summary, PDF Export & Audit Trail (2:35 – 2:45)
- **On-Screen Action:** Navigate to the **"Reports"** tab (`/reports`). Click **"Generate Finance Summary"**, then click **"Download PDF"**. Scroll down to show the **Chronological Audit Trail**.
- **Spoken Narration:**
  > *"Finally, we generate our Daily Reconciliation Certificate. The AI synthesizes an executive narrative suitable for board meetings, and compiles a publication-grade PDF report with full exception tables. Best of all, every single upload, agent execution, and AI explanation is immutably logged in our Chronological Audit Trail for total regulatory compliance. That is autonomous, trustworthy financial reconciliation with FinRecon AI."*
- **Expected Result:**
  - Executive narrative appears.
  - Browser downloads `FinRecon_Report_<batchId>.pdf`.
  - Audit trail shows sequential events (`FILE_UPLOAD_COMPLETED`, `DATA_AGENT_COMPLETED`, `RECONCILIATION_AGENT_COMPLETED`, `REPORT_EXPORTED_PDF`).

---

### 🎤 Key Rehearsal Cheat Sheet:
| Scene | Target Timestamp | Key Hook Phrase |
|---|---|---|
| 1. Upload | 0:00 - 0:25 | *"Inconsistent headers, mixed date formats, single-click autonomous pipeline."* |
| 2. Schema AI | 0:25 - 0:45 | *"Infers mapping on the fly without ever hallucinating numerical amounts."* |
| 3. Matching | 0:45 - 1:05 | *"Weighted fuzzy matching with Dice coefficients avoids false breaks."* |
| 4. Dashboard | 1:05 - 1:30 | *"Instant executive command center with 5 key operational metrics."* |
| 5. Priority | 1:30 - 1:50 | *"Triage by financial risk rather than drowning in spreadsheets."* |
| 6. AI Diagnosis | 1:50 - 2:15 | *"Plain-language root cause and exact actionable next step."* |
| 7. Chat Q&A | 2:15 - 2:35 | *"Speak to your books with 120-Billion parameter Groq speed."* |
| 8. PDF & Audit | 2:35 - 2:45 | *"Publication-grade PDF report and immutable regulatory audit trail."* |
