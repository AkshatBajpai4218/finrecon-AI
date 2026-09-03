import { Router } from 'express';
import { listExceptions, getExceptionById } from '../controllers/exceptions.controller.js';

const router = Router();

// GET /api/exceptions/:batchId - get all exceptions for a batch sorted by priority
router.get('/:batchId', listExceptions);
router.get('/', listExceptions);

// GET /api/exceptions/detail/:txnId - get single exception detail
router.get('/detail/:txnId', getExceptionById);

export default router;
