import { UploadBatch } from '../models/uploadBatch.model.js';
import { Transaction } from '../models/transaction.model.js';
import { runDataAgent } from './dataAgent.js';
import { runReconciliationAgent } from './reconciliationAgent.js';
import { explainBatchExceptions } from './exceptionAgent.js';
import { runReportingAgent } from './reportingAgent.js';
import { classifyException } from '../core/exceptionClassifier.js';
import { getPriority } from '../core/priorityEngine.js';
import { logAction } from '../services/auditService.js';

// In-memory tracker for active pipeline progress (useful for polling)
const pipelineProgress = new Map();

export function getPipelineProgress(batchId) {
  return pipelineProgress.get(String(batchId)) || null;
}

/**
 * FinRecon AI - Master Planner Agent
 *
 * Orchestrates the end-to-end multi-agent reconciliation pipeline:
 * dataAgent -> reconciliationAgent -> exceptionAgent -> reportingAgent.
 *
 * @param {string} batchId - MongoDB UploadBatch ID
 * @param {object} [options={}] - Custom overrides or options
 * @returns {Promise<object>} Complete pipeline reconciliation summary
 */
export async function runPipeline(batchId, options = {}) {
  const batch = await UploadBatch.findById(batchId);
  if (!batch) {
    throw new Error(`UploadBatch not found for ID: ${batchId}`);
  }

  pipelineProgress.set(String(batchId), {
    step: 'data_ingestion',
    status: 'processing',
    message: 'DataAgent: Ingesting files and detecting schemas...',
  });

  await logAction(batchId, 'PIPELINE_START', 'PlannerAgent', {
    paymentFile: batch.paymentFile,
    bankFile: batch.bankFile,
    orderFile: batch.orderFile,
  });

  try {
    // ----------------------------------------------------
    // STEP 1: Data Agent (Ingestion, Schema Mapping, Normalization)
    // ----------------------------------------------------
    pipelineProgress.set(String(batchId), {
      step: 'data_mapping',
      status: 'processing',
      message: 'DataAgent: Normalizing currencies, dates, and references...',
    });

    const dataResult = await runDataAgent(
      {
        paymentFile: options.paymentFile || batch.paymentFile,
        bankFile: options.bankFile || batch.bankFile,
        orderFile: options.orderFile || batch.orderFile,
      },
      options
    );

    await logAction(batchId, 'DATA_AGENT_COMPLETED', 'DataAgent', dataResult.metrics);

    // ----------------------------------------------------
    // STEP 2: Reconciliation Agent (Exact + Fuzzy Matching)
    // ----------------------------------------------------
    pipelineProgress.set(String(batchId), {
      step: 'reconciling',
      status: 'processing',
      message: `ReconciliationAgent: Matching ${dataResult.metrics.paymentCount} transactions...`,
    });

    const reconResult = runReconciliationAgent(
      dataResult.payments,
      dataResult.bank,
      dataResult.orders,
      options
    );

    await logAction(batchId, 'RECONCILIATION_AGENT_COMPLETED', 'ReconciliationAgent', {
      matched: reconResult.matched.length,
      likelyMatches: reconResult.likelyMatches.length,
      exceptions: reconResult.exceptions.length,
    });

    // ----------------------------------------------------
    // STEP 3: Exception Agent & Persistence
    // ----------------------------------------------------
    pipelineProgress.set(String(batchId), {
      step: 'classifying_exceptions',
      status: 'processing',
      message: 'ExceptionAgent: Classifying exceptions and financial priorities...',
    });

    const docsToInsert = [];

    // Matched documents
    for (const m of reconResult.matched) {
      docsToInsert.push({
        batchId,
        txnRef: m.txnRef,
        paymentAmount: m.paymentAmount,
        bankAmount: m.bankAmount,
        orderAmount: m.orderAmount,
        paymentTime: m.paymentTime ? new Date(m.paymentTime) : null,
        bankTime: m.bankTime ? new Date(m.bankTime) : null,
        orderTime: m.orderTime ? new Date(m.orderTime) : null,
        status: 'matched',
        confidence: m.confidence || 1.0,
        priority: getPriority(m),
        explanation: 'Reconciled: matching reference, amounts, and SLA window verified across all three sources.',
        recommendedAction: 'None - Transaction reconciled successfully.',
      });
    }

    // Likely matches (fuzzy 0.70 - 0.89)
    for (const lm of reconResult.likelyMatches) {
      docsToInsert.push({
        batchId,
        txnRef: lm.txnRef,
        paymentAmount: lm.paymentAmount,
        bankAmount: lm.bankAmount,
        orderAmount: lm.orderAmount,
        paymentTime: lm.paymentTime ? new Date(lm.paymentTime) : null,
        bankTime: lm.bankTime ? new Date(lm.bankTime) : null,
        orderTime: lm.orderTime ? new Date(lm.orderTime) : null,
        status: 'likely_match',
        confidence: lm.confidence || 0.85,
        priority: getPriority(lm),
        explanation: `Likely match (${Math.round((lm.confidence || 0.85) * 100)}% fuzzy confidence): slight reference or description variation detected.`,
        recommendedAction: 'Verify transaction reference mapping with merchant.',
      });
    }

    // Unmatched exceptions
    for (const ex of reconResult.exceptions) {
      const status = classifyException(ex, { isDuplicate: ex.isDuplicate });
      const priority = getPriority(ex);

      docsToInsert.push({
        batchId,
        txnRef: ex.txnRef,
        paymentAmount: ex.paymentAmount,
        bankAmount: ex.bankAmount,
        orderAmount: ex.orderAmount,
        paymentTime: ex.paymentTime ? new Date(ex.paymentTime) : null,
        bankTime: ex.bankTime ? new Date(ex.bankTime) : null,
        orderTime: ex.orderTime ? new Date(ex.orderTime) : null,
        status,
        confidence: ex.confidence || 0.9,
        priority,
        explanation: null,
        recommendedAction: 'Manual review required',
      });
    }

    // Reset and persist transactions
    await Transaction.deleteMany({ batchId });
    if (docsToInsert.length > 0) {
      await Transaction.insertMany(docsToInsert);
    }

    // Run AI Exception explanation agent
    pipelineProgress.set(String(batchId), {
      step: 'ai_explaining',
      status: 'processing',
      message: 'ExceptionAgent: Generating AI root cause explanations...',
    });

    try {
      await explainBatchExceptions(batchId, options);
      await logAction(batchId, 'EXCEPTION_AGENT_COMPLETED', 'ExceptionAgent', {
        exceptionsExplained: reconResult.allUnmatched.length,
      });
    } catch (explainErr) {
      console.warn(`[PlannerAgent] Exception agent non-fatal warning: ${explainErr.message}`);
    }

    // ----------------------------------------------------
    // STEP 4: Reporting Agent
    // ----------------------------------------------------
    pipelineProgress.set(String(batchId), {
      step: 'generating_report',
      status: 'processing',
      message: 'ReportingAgent: Synthesizing executive summary narrative...',
    });

    const reportResult = await runReportingAgent(batchId, options);
    await logAction(batchId, 'REPORTING_AGENT_COMPLETED', 'ReportingAgent', {
      matchRate: reportResult.stats.matchRate,
      totalExposure: reportResult.stats.totalExposure,
    });

    // Finalize batch status
    const finalStatus = reconResult.allUnmatched.length > 0 ? 'needs_manual_review' : 'completed';
    await UploadBatch.findByIdAndUpdate(batchId, { status: finalStatus });

    await logAction(batchId, 'PIPELINE_COMPLETED', 'PlannerAgent', {
      finalStatus,
      matched: reconResult.matched.length,
      exceptions: reconResult.allUnmatched.length,
    });

    pipelineProgress.set(String(batchId), {
      step: 'completed',
      status: finalStatus,
      message: 'Reconciliation complete!',
    });

    return {
      status: 'completed',
      batchId,
      finalBatchStatus: finalStatus,
      matched: reconResult.matched.length,
      exceptions: reconResult.allUnmatched.length,
      total: docsToInsert.length,
      matchRate: reportResult.stats.matchRate,
      highPriorityCount: reportResult.stats.highPriorityCount,
      narrative: reportResult.narrative,
      stats: reportResult.stats,
    };
  } catch (pipelineErr) {
    console.error(`[PlannerAgent] Pipeline failed for batch ${batchId}:`, pipelineErr);
    await UploadBatch.findByIdAndUpdate(batchId, { status: 'failed' });
    await logAction(batchId, 'PIPELINE_FAILED', 'PlannerAgent', { error: pipelineErr.message });

    pipelineProgress.set(String(batchId), {
      step: 'failed',
      status: 'failed',
      message: `Reconciliation failed: ${pipelineErr.message}`,
    });

    throw pipelineErr;
  }
}

export default {
  runPipeline,
  getPipelineProgress,
};
