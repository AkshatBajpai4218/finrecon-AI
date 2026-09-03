import { Router } from 'express';
import {
  triggerReconciliation,
  getReconcileStatus,
  getReconciliation,
} from '../controllers/reconcile.controller.js';

const router = Router();

// GET /api/reconcile/:batchId/status - poll batch processing status & progress
router.get('/:batchId/status', getReconcileStatus);

// POST /api/reconcile/:batchId - trigger plannerAgent pipeline
router.post('/:batchId', triggerReconciliation);
router.post('/', triggerReconciliation);

// GET /api/reconcile/:batchId - get reconciliation summary stats
router.get('/:batchId', getReconciliation);
router.get('/', getReconciliation);

export default router;
