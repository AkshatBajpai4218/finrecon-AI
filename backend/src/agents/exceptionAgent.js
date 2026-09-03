import { Transaction } from '../models/transaction.model.js';
import { callClaude } from '../llm/llmClient.js';
import { buildExceptionExplainPrompt } from '../llm/prompts/exceptionExplainPrompt.js';

/**
 * Helper to process promises with a concurrency limit.
 */
async function processWithConcurrency(items, concurrency, taskFn) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(taskFn));
    results.push(...chunkResults);
  }
  return results;
}

/**
 * Generates AI explanation and recommended action for a single transaction.
 */
export async function explainSingleException(transaction, client = callClaude) {
  try {
    const hasKey = Boolean(process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY || client.isMock);
    if (!hasKey) {
      // Degrade gracefully if no LLM API key is configured
      return {
        explanation: transaction.explanation || null,
        recommendedAction: transaction.recommendedAction || 'Manual review required',
      };
    }

    const { systemPrompt, userMessage } = buildExceptionExplainPrompt(transaction);
    const responseText = await client(systemPrompt, userMessage, 512);

    const cleanJson = responseText
      .replace(/```(?:json)?/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleanJson);

    return {
      explanation: parsed.explanation || null,
      recommendedAction: parsed.recommendedAction || 'Manual review required',
    };
  } catch (err) {
    console.warn(`[ExceptionAgent] AI explanation failed for txn ${transaction.txnRef}: ${err.message}`);
    return {
      explanation: null,
      recommendedAction: 'Manual review required',
    };
  }
}

/**
 * FinRecon AI - Exception Explanation Agent
 *
 * Runs for all exceptions in a batch, generating AI reasoning and recommended actions
 * with concurrency limit of ~5, then updating Transaction records in the database.
 *
 * @param {string} batchId - UploadBatch ObjectId
 * @param {object} [options={}] - Options e.g. { concurrency: 5, client: function }
 * @returns {Promise<{ processed: number, updated: number }>}
 */
export async function explainBatchExceptions(batchId, options = {}) {
  const concurrency = options.concurrency || 5;
  const client = options.client || callClaude;

  // Find all non-matched transactions in this batch
  const exceptions = await Transaction.find({
    batchId,
    status: { $ne: 'matched' },
  });

  if (!exceptions || exceptions.length === 0) {
    return { processed: 0, updated: 0 };
  }

  let updatedCount = 0;

  await processWithConcurrency(exceptions, concurrency, async (txn) => {
    const { explanation, recommendedAction } = await explainSingleException(txn.toObject(), client);

    await Transaction.findByIdAndUpdate(txn._id, {
      explanation,
      recommendedAction,
    });

    updatedCount++;
  });

  return {
    processed: exceptions.length,
    updated: updatedCount,
  };
}

export default {
  explainSingleException,
  explainBatchExceptions,
};
