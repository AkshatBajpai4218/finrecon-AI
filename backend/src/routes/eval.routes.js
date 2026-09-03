import { Router } from 'express';
import { runHeldOutEvaluation } from '../../tests/eval/runEval.js';

const router = Router();

/**
 * GET /api/eval/run
 * Triggers the evaluation against data/synthetic/held_out_eval_set on demand
 * and returns precision/recall metrics.
 */
router.get('/run', async (_req, res, next) => {
  try {
    const results = await runHeldOutEvaluation();
    return res.status(200).json(results);
  } catch (err) {
    next(err);
  }
});

export default router;
