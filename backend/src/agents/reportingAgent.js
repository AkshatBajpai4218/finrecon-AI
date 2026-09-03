import { Transaction } from '../models/transaction.model.js';
import { callClaude } from '../llm/llmClient.js';
import { buildReportPrompt } from '../llm/prompts/reportPrompt.js';

/**
 * Aggregates reconciliation metrics for a batch.
 */
export async function computeBatchReportStats(batchId) {
  const transactions = await Transaction.find({ batchId }).lean();
  const total = transactions.length;

  const matchedList = transactions.filter(t => t.status === 'matched');
  const exceptionsList = transactions.filter(t => t.status !== 'matched');

  const matched = matchedList.length;
  const exceptions = exceptionsList.length;
  const matchRate = total > 0 ? Number(((matched / total) * 100).toFixed(1)) : 0;

  const highPriorityCount = exceptionsList.filter(
    t => t.priority === 'critical' || t.priority === 'high'
  ).length;

  let totalExposure = 0;
  let largestDiscrepancy = 0;

  let delayedCount = 0;
  let mismatchCount = 0;
  let missingSettlementCount = 0;
  let unknownCreditCount = 0;
  let duplicateCount = 0;

  for (const ex of exceptionsList) {
    const maxAmt = Math.max(
      ex.paymentAmount || 0,
      ex.bankAmount || 0,
      ex.orderAmount || 0
    );
    totalExposure += maxAmt;
    if (maxAmt > largestDiscrepancy) {
      largestDiscrepancy = maxAmt;
    }

    if (ex.status === 'settlement_delay' || ex.status === 'delay') delayedCount++;
    else if (ex.status === 'amount_mismatch' || ex.status === 'mismatch') mismatchCount++;
    else if (ex.status === 'missing_settlement') missingSettlementCount++;
    else if (ex.status === 'unknown_credit') unknownCreditCount++;
    else if (ex.status === 'duplicate') duplicateCount++;
  }

  return {
    batchId,
    total,
    matched,
    exceptions,
    matchRate,
    highPriorityCount,
    totalExposure: Math.round(totalExposure),
    largestDiscrepancy: Math.round(largestDiscrepancy),
    delayedCount,
    mismatchCount,
    missingSettlementCount,
    unknownCreditCount,
    duplicateCount,
    exceptionsList,
    allTransactions: transactions,
  };
}

/**
 * FinRecon AI - Reporting Agent
 * Synthesizes batch statistics and generates an executive summary narrative.
 *
 * @param {string} batchId
 * @param {object} [options={}]
 * @returns {Promise<{ stats: object, narrative: string }>}
 */
export async function runReportingAgent(batchId, options = {}) {
  const stats = await computeBatchReportStats(batchId);
  const client = options.client || callClaude;

  let narrative = '';

  if (process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY || client.isMock) {
    try {
      const { systemPrompt, userMessage } = buildReportPrompt(stats);
      narrative = await client(systemPrompt, userMessage, 512);
      narrative = narrative.trim();
    } catch (err) {
      console.warn(`[ReportingAgent] Claude report generation warning: ${err.message}`);
    }
  }

  // Graceful deterministic narrative fallback
  if (!narrative) {
    narrative = `Batch reconciliation completed across ${stats.total} total transactions with an automated match rate of ${stats.matchRate}%. A total of ${stats.exceptions} discrepancies were identified, representing ₹${stats.totalExposure.toLocaleString('en-IN')} in aggregate exposure. Key anomalies consist of ${stats.mismatchCount} amount mismatches and ${stats.delayedCount} settlement delays beyond standard SLA. Exactly ${stats.highPriorityCount} high or critical priority items have been escalated for immediate finance review.`;
  }

  return {
    stats,
    narrative,
  };
}

export default {
  computeBatchReportStats,
  runReportingAgent,
};
