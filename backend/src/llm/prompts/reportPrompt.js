/**
 * FinRecon AI - Daily Reconciliation Report Narrative Prompt
 *
 * Prompts Claude to write a professional, executive-ready 4-5 sentence finance summary
 * detailing batch match rate, exposure variance, and prioritized action items.
 */

/**
 * Builds system and user prompts for Claude executive reconciliation report generation.
 * @param {object} stats - Aggregated batch statistics
 * @returns {{ systemPrompt: string, userMessage: string }}
 */
export function buildReportPrompt(stats = {}) {
  const systemPrompt = `You are the Chief Financial Controller AI at FinRecon AI.
Your role is to write a concise, authoritative "Daily Reconciliation Summary" narrative (4 to 5 sentences).

GUIDELINES:
- Professional tone suitable for CFOs and Finance Directors.
- Include total transactions, match rate %, total unreconciled exposure, and breakdown of key anomalies (mismatches, delays, missing settlements).
- Emphasize priority risks and immediate next operational steps.
- Do NOT use markdown code blocks or bullet lists; write a flowing narrative paragraph of 4-5 sentences.`;

  const userMessage = `Batch Summary Metrics:
- Total Transactions: ${stats.total || 0}
- Matched Volume: ${stats.matched || 0}
- Total Exceptions: ${stats.exceptions || 0}
- Match Rate: ${stats.matchRate || '0.0'}%
- High/Critical Priority Count: ${stats.highPriorityCount || 0}
- Total Financial Exposure (At Risk): ₹${Number(stats.totalExposure || 0).toLocaleString('en-IN')}
- Largest Discrepancy: ₹${Number(stats.largestDiscrepancy || 0).toLocaleString('en-IN')}
- Settlement Delays: ${stats.delayedCount || 0}
- Amount Mismatches: ${stats.mismatchCount || 0}
- Missing Bank Settlements: ${stats.missingSettlementCount || 0}
- Unknown Credits: ${stats.unknownCreditCount || 0}
- Duplicates: ${stats.duplicateCount || 0}

Generate the 4-5 sentence Daily Reconciliation Summary narrative:`;

  return { systemPrompt, userMessage };
}

export default {
  buildReportPrompt,
};
