import { Transaction } from '../models/transaction.model.js';
import { UploadBatch } from '../models/uploadBatch.model.js';
import { callClaude } from './llmClient.js';

/**
 * FinRecon AI - Natural Language Query Engine ("Ask your books")
 * Retrieves contextually relevant transactions using Mongoose heuristic filters
 * and generates precise, grounded answers via Claude/Groq.
 *
 * @param {string} question - User question in plain language
 * @param {string} [batchId] - Optional batch scope; defaults to latest batch
 * @param {object} [options={}]
 * @returns {Promise<{ answer: string, retrievedCount: number, batchId: string }>}
 */
export async function queryBooks(question, batchId, options = {}) {
  const client = options.client || callClaude;

  let activeBatchId = batchId;
  if (!activeBatchId) {
    const latestBatch = await UploadBatch.findOne().sort({ createdAt: -1 });
    if (latestBatch) {
      activeBatchId = latestBatch._id.toString();
    }
  }

  const qLower = String(question || '').toLowerCase();

  // 1. Build heuristic filter query
  const query = {};
  if (activeBatchId) {
    query.batchId = activeBatchId;
  }

  let limit = 20;

  // Specific Transaction ID detection (e.g. "TXN2044", "TXN-20260901-003", "TXN1002")
  const txnIdMatch = question.match(/\b(txn[-_]?[a-z0-9]+)\b/i);
  if (txnIdMatch) {
    const ref = txnIdMatch[1].trim();
    query.txnRef = new RegExp(`^${ref}$`, 'i');
  }

  // 1. Amount Threshold Detection (e.g. "above 10000", "above ₹10,000", "greater than 5000", "> 20000", "more than 10000", "over 10000")
  let isThresholdQuery = false;
  let thresholdType = null; // 'above' or 'below'
  let thresholdAmount = null;

  const aboveMatch = qLower.match(/(?:above|greater than|more than|higher than|exceeding|over|>|>=)\s*(?:₹|inr|rs\.?)?\s*([\d,]+(?:\.\d+)?)/i);
  const belowMatch = qLower.match(/(?:below|less than|smaller than|under|<|<=)\s*(?:₹|inr|rs\.?)?\s*([\d,]+(?:\.\d+)?)/i);

  if (aboveMatch) {
    const threshold = parseFloat(aboveMatch[1].replace(/,/g, ''));
    if (!isNaN(threshold) && threshold > 0) {
      isThresholdQuery = true;
      thresholdType = 'above';
      thresholdAmount = threshold;
      query.$or = [
        { paymentAmount: { $gte: threshold } },
        { bankAmount: { $gte: threshold } },
        { orderAmount: { $gte: threshold } },
      ];
    }
  } else if (belowMatch) {
    const threshold = parseFloat(belowMatch[1].replace(/,/g, ''));
    if (!isNaN(threshold) && threshold > 0) {
      isThresholdQuery = true;
      thresholdType = 'below';
      thresholdAmount = threshold;
      query.$or = [
        { paymentAmount: { $lte: threshold } },
        { bankAmount: { $lte: threshold } },
        { orderAmount: { $lte: threshold } },
      ];
    }
  }

  // 2. Exact Amount Detection: only if NOT a threshold query and NOT a transaction ID query
  let isExactAmountQuery = false;
  let exactTargetAmount = null;

  if (!isThresholdQuery && !txnIdMatch) {
    const exactAmtRegexes = [
      /(?:of|worth|amount|for|with|value|having)\s*(?:₹|inr|rs\.?)?\s*([\d,]+(?:\.\d+)?)\s*(?:rupees?|rs\.?|inr)?/i,
      /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i,
      /\b([\d,]{3,7})\s*(?:rupees?|rs\.?|inr)\b/i,
      /\btransactions?\s+of\s+([\d,]+(?:\.\d+)?)/i,
    ];

    for (const reg of exactAmtRegexes) {
      const match = qLower.match(reg);
      if (match) {
        const val = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0) {
          exactTargetAmount = val;
          isExactAmountQuery = true;
          break;
        }
      }
    }

    // Fallback isolated number (e.g. "give my transactions 7920")
    if (!isExactAmountQuery) {
      const fallbackNum = qLower.match(/\b(\d{3,6}(?:\.\d+)?)\b/);
      if (fallbackNum) {
        const val = parseFloat(fallbackNum[1]);
        if (!isNaN(val) && val >= 100) {
          exactTargetAmount = val;
          isExactAmountQuery = true;
        }
      }
    }

    if (isExactAmountQuery && exactTargetAmount !== null) {
      query.$or = [
        { paymentAmount: exactTargetAmount },
        { bankAmount: exactTargetAmount },
        { orderAmount: exactTargetAmount },
        { paymentAmount: { $gte: exactTargetAmount - 1, $lte: exactTargetAmount + 1 } },
        { bankAmount: { $gte: exactTargetAmount - 1, $lte: exactTargetAmount + 1 } },
        { orderAmount: { $gte: exactTargetAmount - 1, $lte: exactTargetAmount + 1 } },
      ];
    }
  }

  // Status / Exception intent detection
  if (qLower.includes('failed') || qLower.includes('exception') || qLower.includes('discrepanc') || qLower.includes('break')) {
    query.status = { $ne: 'matched' };
  } else if (qLower.includes('delayed') || qLower.includes('delay') || qLower.includes('late')) {
    query.status = { $in: ['settlement_delay', 'delay'] };
  } else if (qLower.includes('missing')) {
    query.status = 'missing_settlement';
  } else if (qLower.includes('duplicate')) {
    query.status = 'duplicate';
  } else if (qLower.includes('mismatch')) {
    query.status = { $in: ['amount_mismatch', 'mismatch'] };
  } else if (qLower.includes('unknown') || qLower.includes('unidentified')) {
    query.status = 'unknown_credit';
  } else if (qLower.includes('matched') || qLower.includes('success')) {
    query.status = 'matched';
  }

  // Priority intent
  if (qLower.includes('critical')) query.priority = 'critical';
  else if (qLower.includes('high priority')) query.priority = 'high';

  // "Biggest" / "highest" exception intent
  if (qLower.includes('biggest') || qLower.includes('highest') || qLower.includes('largest') || qLower.includes('most expensive')) {
    query.status = { $ne: 'matched' };
    limit = 5;
  }

  // 3. Execute retrieval
  let transactions = await Transaction.find(query).limit(limit).lean();

  // If 0 results within active batch and user queried exact amount, txn ID, or threshold,
  // or user asked for "all transactions", fall back to searching across the entire database
  if (transactions.length === 0 && (isExactAmountQuery || txnIdMatch || isThresholdQuery || qLower.includes('all transactions'))) {
    const globalQuery = { ...query };
    delete globalQuery.batchId;
    transactions = await Transaction.find(globalQuery).limit(limit).lean();
  }

  // If threshold query or sorting by highest amount requested, sort descending
  if (isThresholdQuery || qLower.includes('biggest') || qLower.includes('highest') || qLower.includes('largest')) {
    transactions.sort((a, b) => {
      const amtA = Math.max(a.paymentAmount || 0, a.bankAmount || 0, a.orderAmount || 0);
      const amtB = Math.max(b.paymentAmount || 0, b.bankAmount || 0, b.orderAmount || 0);
      return amtB - amtA;
    });
  }

  // 3. Compute aggregate summary metrics for broader analytical questions
  const allTxns = activeBatchId ? await Transaction.find({ batchId: activeBatchId }).lean() : [];
  const total = allTxns.length;
  const matchedCount = allTxns.filter(t => t.status === 'matched').length;
  const exceptionsList = allTxns.filter(t => t.status !== 'matched');
  const matchRate = total > 0 ? ((matchedCount / total) * 100).toFixed(1) : '0.0';

  const statsOverview = {
    batchId: activeBatchId || 'Global Scope',
    totalTransactions: total,
    matchedCount,
    exceptionsCount: exceptionsList.length,
    matchRate: `${matchRate}%`,
    criticalCount: exceptionsList.filter(t => t.priority === 'critical').length,
    highCount: exceptionsList.filter(t => t.priority === 'high').length,
  };

  // Compact representation for LLM prompt
  const compactRecords = transactions.slice(0, 15).map(t => ({
    id: t.txnRef,
    status: t.status,
    priority: t.priority,
    paymentAmount: t.paymentAmount,
    bankAmount: t.bankAmount,
    orderAmount: t.orderAmount,
    reason: t.explanation,
    action: t.recommendedAction,
  }));

  // 4. Prompt construction
  const systemPrompt = `You are the AI Financial Controller at FinRecon AI.
Your purpose is to answer the merchant's questions about their reconciled books, match rates, discrepancies, and transactions.

RULES:
- Answer ONLY using the provided batch statistics and retrieved transaction records.
- When presenting multiple transactions, exceptions, breaks, or comparison lists, ALWAYS format them as a clean, complete Markdown table with the following columns:
  | Reference ID | Status | Priority | Payment Gateway | Bank Amount | Order Value | AI Diagnosis / Reason |
- For summary questions (e.g. match rate, overview), summarize key metrics clearly and provide a small Markdown table of metrics where appropriate.
- If the retrieved records match the user's specific request (e.g. an amount or transaction ID), list each transaction inside a Markdown table with its Reference ID, status, priority, and source amounts.
- If the provided records do not contain the answer, say clearly: "The current reconciliation data does not contain this information."
- Always format currency values with ₹ symbols (e.g. ₹7,920).
- Keep answers professional, concise, clear, and actionable.`;

  const userMessage = `User Question: "${question}"

Current Batch Overview:
${JSON.stringify(statsOverview, null, 2)}

Retrieved Transaction Records (${compactRecords.length} found):
${JSON.stringify(compactRecords, null, 2)}

Provide an accurate, grounded answer:`;

  // 5. Generate answer
  let answer = '';

  if (process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY || client.isMock) {
    try {
      answer = await client(systemPrompt, userMessage, 2048);
      answer = answer ? answer.trim() : '';

      // Validate: if LLM response starts a table but is truncated (has pipe but no separator or rows),
      // fall back to our deterministic generator so the merchant always gets a complete table
      if (transactions.length > 0 && answer.includes('|')) {
        const hasSeparator = /\|?\s*:?-+:?\s*\|/.test(answer);
        const pipeCount = (answer.match(/\|/g) || []).length;
        if (!hasSeparator || pipeCount < 6) {
          console.warn('[NLQueryEngine] LLM response contained incomplete/truncated table. Falling back to full structured table.');
          answer = '';
        }
      }
    } catch (err) {
      console.warn(`[NLQueryEngine] LLM query warning: ${err.message}`);
    }
  }

  // Deterministic fallback if LLM is unavailable or returned blank
  if (!answer) {
    if (isThresholdQuery && thresholdAmount !== null) {
      if (transactions.length > 0) {
        const dir = thresholdType === 'above' ? 'above' : 'below';
        const rows = transactions.map(t => {
          const p = t.paymentAmount != null ? `₹${t.paymentAmount.toLocaleString('en-IN')}` : 'N/A';
          const b = t.bankAmount != null ? `₹${t.bankAmount.toLocaleString('en-IN')}` : 'N/A';
          const o = t.orderAmount != null ? `₹${t.orderAmount.toLocaleString('en-IN')}` : 'N/A';
          return `| ${t.txnRef} | ${t.status} | ${t.priority} | ${p} | ${b} | ${o} | ${t.explanation || 'Amount matches threshold'} |`;
        }).join('\n');

        answer = `Found **${transactions.length}** transaction(s) with amount ${dir} **₹${thresholdAmount.toLocaleString('en-IN')}**:\n\n` +
          `| Reference ID | Status | Priority | Payment Gateway | Bank Amount | Order Value | AI Diagnosis |\n` +
          `| :--- | :--- | :---: | ---: | ---: | ---: | :--- |\n` +
          rows;
      } else {
        answer = `No transactions with an amount ${thresholdType === 'above' ? 'above' : 'below'} ₹${thresholdAmount.toLocaleString('en-IN')} were found in the current reconciliation ledger.`;
      }
    } else if (isExactAmountQuery && exactTargetAmount !== null) {
      if (transactions.length > 0) {
        const rows = transactions.map(t => {
          const p = t.paymentAmount != null ? `₹${t.paymentAmount.toLocaleString('en-IN')}` : 'N/A';
          const b = t.bankAmount != null ? `₹${t.bankAmount.toLocaleString('en-IN')}` : 'N/A';
          const o = t.orderAmount != null ? `₹${t.orderAmount.toLocaleString('en-IN')}` : 'N/A';
          return `| ${t.txnRef} | ${t.status} | ${t.priority} | ${p} | ${b} | ${o} | ${t.explanation || 'Matches query criteria'} |`;
        }).join('\n');

        answer = `Found **${transactions.length}** transaction(s) involving **₹${exactTargetAmount.toLocaleString('en-IN')}**:\n\n` +
          `| Reference ID | Status | Priority | Payment Gateway | Bank Amount | Order Value | AI Diagnosis |\n` +
          `| :--- | :--- | :---: | ---: | ---: | ---: | :--- |\n` +
          rows;
      } else {
        answer = `No transactions with an amount of ₹${exactTargetAmount.toLocaleString('en-IN')} were found in the current reconciliation ledger.`;
      }
    } else if (qLower.includes('rate') || qLower.includes('low') || qLower.includes('overview')) {
      answer = `Today's reconciliation rate is **${matchRate}%** (${matchedCount} of ${total} transactions matched). There are **${exceptionsList.length}** exceptions requiring review.\n\n` +
        `| Metric | Value | Status |\n` +
        `| :--- | ---: | :--- |\n` +
        `| Total Processed Records | ${total} | Verified |\n` +
        `| Matched Cleanly | ${matchedCount} | Green |\n` +
        `| Total Exceptions / Breaks | ${exceptionsList.length} | Needs Attention |\n` +
        `| Match Rate | ${matchRate}% | ${parseFloat(matchRate) >= 90 ? 'Healthy' : 'Sub-optimal'} |\n` +
        `| Critical Priority Risks | ${statsOverview.criticalCount} | Immediate Action |\n` +
        `| High Priority Risks | ${statsOverview.highCount} | Review Today |`;
    } else if (qLower.includes('biggest') || qLower.includes('largest') || qLower.includes('highest')) {
      const topEx = transactions[0];
      if (topEx) {
        const topAmt = Math.max(topEx.paymentAmount || 0, topEx.bankAmount || 0, topEx.orderAmount || 0);
        answer = `The largest exception is transaction **${topEx.txnRef}** with an exposure of **₹${topAmt.toLocaleString('en-IN')}**.\n\n` +
          `| Reference ID | Status | Priority | Exposure Amount | AI Diagnosis | Recommended Action |\n` +
          `| :--- | :--- | :---: | ---: | :--- | :--- |\n` +
          `| ${topEx.txnRef} | ${topEx.status} | ${topEx.priority} | ₹${topAmt.toLocaleString('en-IN')} | ${topEx.explanation || 'Requires manual review'} | ${topEx.recommendedAction || 'Investigate gateway logs'} |`;
      } else {
        answer = 'No exceptions found for this batch.';
      }
    } else if (transactions.length > 0) {
      const rows = transactions.slice(0, 10).map(t => {
        const p = t.paymentAmount != null ? `₹${t.paymentAmount.toLocaleString('en-IN')}` : 'N/A';
        const b = t.bankAmount != null ? `₹${t.bankAmount.toLocaleString('en-IN')}` : 'N/A';
        const o = t.orderAmount != null ? `₹${t.orderAmount.toLocaleString('en-IN')}` : 'N/A';
        return `| ${t.txnRef} | ${t.status} | ${t.priority} | ${p} | ${b} | ${o} | ${t.explanation || 'Reconciliation exception'} |`;
      }).join('\n');

      answer = `Found **${transactions.length}** matching transaction(s) for your inquiry:\n\n` +
        `| Reference ID | Status | Priority | Payment Gateway | Bank Amount | Order Value | AI Diagnosis |\n` +
        `| :--- | :--- | :---: | ---: | ---: | ---: | :--- |\n` +
        rows;
    } else {
      answer = 'No transactions matched the criteria specified in your question for this batch.';
    }
  }

  return {
    answer,
    retrievedCount: transactions.length,
    batchId: activeBatchId,
  };
}

export default {
  queryBooks,
};
