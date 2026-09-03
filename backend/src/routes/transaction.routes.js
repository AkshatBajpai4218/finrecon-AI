import { Router } from 'express';
import { Transaction } from '../models/transaction.model.js';

const router = Router();

/**
 * GET /api/transactions/:txnId
 * Returns full Transaction document by Mongo _id or txnRef.
 */
router.get('/:txnId', async (req, res, next) => {
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
      return res.status(404).json({ error: `Transaction ${txnId} not found` });
    }

    return res.status(200).json(txn);
  } catch (err) {
    next(err);
  }
});

export default router;
