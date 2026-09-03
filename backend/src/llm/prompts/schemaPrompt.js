/**
 * FinRecon AI - AI Schema Mapping Prompt
 *
 * Directs Claude to inspect CSV headers and sample data rows,
 * identifying which columns represent { txnRef, amount, time, description }.
 */

/**
 * Builds the system prompt and user message for Claude schema inference.
 *
 * @param {Array<object>} sampleRows - 3 to 5 sample row records.
 * @param {string} sourceType - "payment" | "bank" | "order"
 * @returns {{ systemPrompt: string, userMessage: string }}
 */
export function buildSchemaPrompt(sampleRows = [], sourceType = 'payment') {
  const headers = sampleRows.length > 0 ? Object.keys(sampleRows[0]) : [];

  const systemPrompt = `You are a financial data integration specialist at FinRecon AI.
Your objective is to inspect sample CSV rows from a financial source ("${sourceType}") and determine the exact column names that correspond to our four canonical fields:

1. txnRef: The primary transaction reference number, gateway ID, bank reference, or order ID.
2. amount: The transaction amount, credit, deposit, or charge.
3. time: The transaction timestamp, booking date, value date, or order date.
4. description: Transaction description, narration, customer name, or status.

STRICT RULES:
- Output MUST be a valid JSON object ONLY.
- Format:
{
  "txnRef": "<exact_column_name_for_reference>",
  "amount": "<exact_column_name_for_amount>",
  "time": "<exact_column_name_for_date>",
  "description": "<exact_column_name_for_description>"
}
- NEVER calculate, convert, or alter any values. Your only task is mapping column header names.
- Return raw JSON with NO markdown backticks or explanation.`;

  const userMessage = `Source Type: ${sourceType}
Available Header Columns: ${JSON.stringify(headers)}
Sample Records (first ${Math.min(sampleRows.length, 5)}):
${JSON.stringify(sampleRows.slice(0, 5), null, 2)}

Determine the column mapping:`;

  return { systemPrompt, userMessage };
}

export default {
  buildSchemaPrompt,
};
