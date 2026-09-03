import { Router } from 'express';
import validateRequest from '../middleware/validateRequest.js';
import { chat } from '../controllers/chat.controller.js';
const router = Router(); router.post('/', validateRequest(['question']), chat); export default router;
