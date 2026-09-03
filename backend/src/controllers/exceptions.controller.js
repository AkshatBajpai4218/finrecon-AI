import { Transaction } from '../models/transaction.model.js';
import { UploadBatch } from '../models/uploadBatch.model.js';

const priorityWeight = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * GET /api/exceptions/:batchId
 * Returns all Transaction rows for the batch where status != "matched",
 * sorted by priority (critical -> high -> medium -> low).
 */
export async function listExceptions(req, res, next) {
  try {
    let batchId = req.params.batchId || req.query.batchId;

    if (!batchId) {
      const latestBatch = await UploadBatch.findOne().sort({ createdAt: -1 });
      if (!latestBatch) {
        return res.json({ exceptions: [], total: 0 });
      }
      batchId = latestBatch._id;
    }

    const query = {
      batchId,
      status: { $ne: 'matched' },
    };

    // Optional status filter
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Optional priority filter
    if (req.query.priority) {
      query.priority = req.query.priority;
    }

    const rawExceptions = await Transaction.find(query).lean();

    // Sort descending by priority weight, then by amount
    rawExceptions.sort((a, b) => {
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      const amtA = Math.max(a.paymentAmount || 0, a.bankAmount || 0, a.orderAmount || 0);
      const amtB = Math.max(b.paymentAmount || 0, b.bankAmount || 0, b.orderAmount || 0);
      return amtB - amtA;
    });

    return res.status(200).json({
      batchId,
      total: rawExceptions.length,
      exceptions: rawExceptions,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/exceptions/detail/:txnId
 * Returns detail for a specific transaction by MongoDB _id or txnRef.
 */
export async function getExceptionById(req, res, next) {
  try {
    const { txnId } = req.params;
    let txn = null;

    if (txnId.match(/^[0-9a-fA-F]{24}$/)) {
      txn = await Transaction.findById(txnId).lean();
    }
    if (!txn) {
      txn = await Transaction.findOne({ txnRef: txnId }).lean();
    }

    if (!txn) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    return res.status(200).json(txn);
  } catch (err) {
    next(err);
  }
}

export default {
  listExceptions,
  getExceptionById,
};
