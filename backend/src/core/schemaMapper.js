import { normalizeAmount, normalizeDate } from './normalizer.js';
import { callClaude } from '../llm/llmClient.js';
import { buildSchemaPrompt } from '../llm/prompts/schemaPrompt.js';

/**
 * Deterministic (hardcoded) fallback mapper
 */
export function mapSchemaHardcoded(rows, sourceType) {
  if (!Array.isArray(rows)) return [];

  const type = String(sourceType || '').toLowerCase().trim();

  return rows.map(row => {
    if (!row || typeof row !== 'object') {
      return { txnRef: '', amount: 0, time: null, description: '' };
    }

    let rawRef = '';
    let rawAmount = null;
    let rawTime = null;
    let rawDescription = '';

    switch (type) {
      case 'payment': {
        rawRef = row.transaction_id ?? row.txn_id ?? row.txnRef ?? row.reference ?? row.id ?? '';
        rawAmount = row.amount ?? row.payment_amount ?? 0;
        rawTime = row.timestamp ?? row.payment_time ?? row.created_at ?? row.date ?? row.time ?? null;
        rawDescription = row.status ?? row.description ?? '';
        break;
      }

      case 'bank': {
        rawRef = row.reference ?? row.bank_ref ?? row.reference_id ?? row.txnRef ?? row.transaction_id ?? '';
        rawAmount = row.credit ?? row.credit_amount ?? row.deposit ?? row.amount ?? 0;
        rawTime = row.date ?? row.value_date ?? row.booking_date ?? row.timestamp ?? row.time ?? null;
        rawDescription = row.description ?? row.narration ?? '';
        break;
      }

      case 'order':
      case 'orders': {
        rawRef = row.txn_ref || row.payment_id || row.txnRef || row.transaction_id || row.order_id || row.orderId || row.paymentId || '';
        rawAmount = row.order_amount ?? row.amount ?? row.total_price ?? 0;
        rawTime = row.order_date ?? row.created_at ?? row.date ?? row.time ?? row.timestamp ?? null;
        rawDescription = row.customer ?? row.customer_name ?? row.description ?? '';
        break;
      }

      default: {
        rawRef = row.txnRef ?? row.transaction_id ?? row.reference ?? row.order_id ?? row.payment_id ?? '';
        rawAmount = row.amount ?? row.credit ?? row.order_amount ?? 0;
        rawTime = row.timestamp ?? row.date ?? row.time ?? null;
        rawDescription = row.description ?? row.status ?? row.customer ?? '';
        break;
      }
    }

    return {
      txnRef: String(rawRef).trim(),
      amount: normalizeAmount(rawAmount),
      time: normalizeDate(rawTime),
      description: String(rawDescription ?? '').trim(),
    };
  });
}

/**
 * AI-Assisted Schema Mapper
 *
 * Calls Claude to infer column mapping from 3-5 sample rows, parses JSON defensively,
 * and falls back to deterministic logic if AI is unavailable, parsing fails, or confidence is low.
 *
 * @param {Array<object>} rows - Array of CSV row records
 * @param {string} sourceType - "payment" | "bank" | "order"
 * @param {object} [options={}] - Options e.g. { useAI: boolean, llmClient: function }
 * @returns {Promise<Array<{ txnRef: string, amount: number, time: string|null, description: string }>>}
 */
export async function mapSchema(rows = [], sourceType = 'payment', options = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const useAI = options.useAI ?? Boolean(process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY || options.mockLLM);
  const client = options.llmClient || callClaude;

  if (useAI) {
    try {
      const sample = rows.slice(0, 5);
      const { systemPrompt, userMessage } = buildSchemaPrompt(sample, sourceType);

      const responseText = await client(systemPrompt, userMessage);

      // Clean markdown code fences defensively
      const cleanJson = responseText
        .replace(/```(?:json)?/gi, '')
        .replace(/```/g, '')
        .trim();

      const mapping = JSON.parse(cleanJson);

      // Validate mapping contains essential fields
      const headers = Object.keys(rows[0] || {});
      const hasRef = mapping.txnRef && headers.includes(mapping.txnRef);
      const hasAmt = mapping.amount && headers.includes(mapping.amount);

      if (hasRef && hasAmt) {
        return rows.map(row => ({
          txnRef: String(row[mapping.txnRef] ?? '').trim(),
          amount: normalizeAmount(row[mapping.amount]),
          time: normalizeDate(row[mapping.time]),
          description: String(row[mapping.description] ?? '').trim(),
        }));
      } else {
        console.warn(`[AI SchemaMapper] Incomplete AI mapping for ${sourceType}. Falling back to hardcoded mapper.`);
      }
    } catch (err) {
      console.warn(`[AI SchemaMapper] AI inference failed (${err.message}). Falling back to hardcoded mapper.`);
    }
  }

  // Graceful deterministic fallback
  return mapSchemaHardcoded(rows, sourceType);
}

export default mapSchema;
