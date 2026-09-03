import { runPipeline, getPipelineProgress } from '../agents/plannerAgent.js';
import { UploadBatch } from '../models/uploadBatch.model.js';
import { Transaction } from '../models/transaction.model.js';

/**
 * POST /api/reconcile/:batchId
 * Triggers the end-to-end multi-agent pipeline via plannerAgent.runPipeline.
 */
export async function triggerReconciliation(req, res, next) {
  try {
    const batchId = req.params.batchId || req.body.batchId;
    if (!batchId) {
      return res.status(400).json({ error: 'batchId parameter is required' });
    }

    // Single call to plannerAgent
    const result = await runPipeline(batchId);

    // Compute chart distribution for UI
    const transactions = await Transaction.find({ batchId }).lean();
    const exceptionsList = transactions.filter(t => t.status !== 'matched');

    const chart = [
      'amount_mismatch',
      'missing_settlement',
      'unknown_credit',
      'settlement_delay',
      'duplicate',
    ].map(type => ({
      type,
      count: exceptionsList.filter(t => {
        if (type === 'amount_mismatch') return t.status === 'amount_mismatch' || t.status === 'mismatch';
        if (type === 'settlement_delay') return t.status === 'settlement_delay' || t.status === 'delay';
        return t.status === type;
      }).length,
      label: formatTypeLabel(type),
    }));

    return res.status(200).json({
      status: 'completed',
      batchId,
      matched: result.matched,
      exceptions: result.exceptions,
      total: result.total,
      matchRate: result.matchRate,
      highPriorityCount: result.highPriorityCount,
      narrative: result.narrative,
      chart,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reconcile/:batchId/status
 * Returns current UploadBatch.status and progress step so frontend can poll.
 */
export async function getReconcileStatus(req, res, next) {
  try {
    const { batchId } = req.params;
    const batch = await UploadBatch.findById(batchId).lean();

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const progress = getPipelineProgress(batchId) || {
      step: batch.status === 'completed' ? 'completed' : 'processing',
      status: batch.status,
      message: batch.status === 'completed' ? 'Reconciliation completed' : 'Processing...',
    };

    return res.status(200).json({
      batchId,
      status: batch.status,
      progress,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reconcile/:batchId
 * Returns reconciliation summary metrics for a given batch or the most recent batch.
 */
export async function getReconciliation(req, res, next) {
  try {
    let batchId = req.params.batchId;
    if (!batchId) {
      const latestBatch = await UploadBatch.findOne().sort({ createdAt: -1 });
      if (!latestBatch) {
        return res.json({
          matched: 0,
          exceptions: 0,
          total: 0,
          matchRate: 0,
          highPriorityCount: 0,
          chart: [],
        });
      }
      batchId = latestBatch._id;
    }

    const transactions = await Transaction.find({ batchId }).lean();
    const total = transactions.length;
    const matched = transactions.filter(t => t.status === 'matched').length;
    const exceptionsList = transactions.filter(t => t.status !== 'matched');
    const exceptions = exceptionsList.length;
    const highPriorityCount = exceptionsList.filter(
      t => t.priority === 'critical' || t.priority === 'high'
    ).length;
    const matchRate = total > 0 ? Number(((matched / total) * 100).toFixed(1)) : 0;

    const chart = [
      'amount_mismatch',
      'missing_settlement',
      'unknown_credit',
      'settlement_delay',
      'duplicate',
    ].map(type => ({
      type,
      count: exceptionsList.filter(t => {
        if (type === 'amount_mismatch') return t.status === 'amount_mismatch' || t.status === 'mismatch';
        if (type === 'settlement_delay') return t.status === 'settlement_delay' || t.status === 'delay';
        return t.status === type;
      }).length,
      label: formatTypeLabel(type),
    }));

    return res.json({
      batchId,
      matched,
      exceptions,
      total,
      matchRate,
      highPriorityCount,
      chart,
    });
  } catch (err) {
    next(err);
  }
}

function formatTypeLabel(type) {
  switch (type) {
    case 'amount_mismatch': return 'Amount Mismatch';
    case 'missing_settlement': return 'Missing Settlement';
    case 'unknown_credit': return 'Unknown Credit';
    case 'settlement_delay': return 'Settlement Delay';
    case 'duplicate': return 'Duplicate';
    default: return type;
  }
}

export default {
  triggerReconciliation,
  getReconcileStatus,
  getReconciliation,
};
