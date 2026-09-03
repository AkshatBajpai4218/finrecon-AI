import { Router } from 'express';
import { getReport, getBatchAuditTrail } from '../controllers/reports.controller.js';

const router = Router();

// Audit Trail Routes
router.get('/:batchId/audit', getBatchAuditTrail);
router.get('/audit/:batchId', getBatchAuditTrail);
router.get('/audit', getBatchAuditTrail);

// Reports Routes
router.get('/:batchId', getReport);
router.get('/', getReport);

export default router;
