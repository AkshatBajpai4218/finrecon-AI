/**
 * FinRecon AI - Exception Explanation Prompt
 *
 * Prompts Claude to provide plain-language, executive-friendly root cause explanations
 * and concrete recommended actions for flagged financial exceptions.
 */

/**
 * Builds system and user prompts for explaining an individual financial exception.
 *
 * @param {object} exceptionRecord
 * @returns {{ systemPrompt: string, userMessage: string }}
 */
export function buildExceptionExplainPrompt(exceptionRecord = {}) {
  const systemPrompt = `You are an expert AI Finance Controller at FinRecon AI.
Your job is to analyze flagged reconciliation discrepancies across Payment Gateway, Bank Statement, and Orders data.

Provide:
1. explanation: 2 to 3 clear, plain-language sentences explaining why the discrepancy occurred, avoiding excessive jargon.
2. recommendedAction: exactly 1 concise, actionable sentence directing a finance team member on what to do next.

STRICT FORMAT:
Return ONLY a valid JSON object matching:
{
  "explanation": "2-3 plain language sentences...",
  "recommendedAction": "One short actionable next step sentence."
}
No markdown fences, no conversational filler.`;

  const userMessage = `Exception Details:
- Transaction Reference: ${exceptionRecord.txnRef || 'N/A'}
- Classification Status: ${exceptionRecord.status || 'unknown'}
- Priority Tier: ${exceptionRecord.priority || 'medium'}
- Payment Gateway Amount: ${exceptionRecord.paymentAmount != null ? `₹${exceptionRecord.paymentAmount}` : 'None (missing)'}
- Bank Statement Amount: ${exceptionRecord.bankAmount != null ? `₹${exceptionRecord.bankAmount}` : 'None (missing)'}
- Orders Amount: ${exceptionRecord.orderAmount != null ? `₹${exceptionRecord.orderAmount}` : 'None (missing)'}
- Payment Time: ${exceptionRecord.paymentTime || 'N/A'}
- Bank Deposit Time: ${exceptionRecord.bankTime || 'N/A'}
- Order Time: ${exceptionRecord.orderTime || 'N/A'}

Provide the explanation and recommended action in JSON:`;

  return { systemPrompt, userMessage };
}

export default {
  buildExceptionExplainPrompt,
};
