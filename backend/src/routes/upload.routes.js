import { Router } from 'express';
import upload from '../middleware/upload.middleware.js';
import { uploadFiles } from '../controllers/upload.controller.js';

const router = Router();

// Accept 3 files with any fieldnames (payment, bank, orders, etc.)
router.post('/', upload.any(), uploadFiles);

export default router;
