import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../../src/db/connection.js';
import { UploadBatch } from '../../src/models/uploadBatch.model.js';
import { Transaction } from '../../src/models/transaction.model.js';
import { runPipeline } from '../../src/agents/plannerAgent.js';
import { computeMetrics } from './metrics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Runs the held-out evaluation pipeline against data/synthetic/held_out_eval_set.
 * @returns {Promise<object>}
 */
export async function runHeldOutEvaluation() {
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  const evalDir = path.resolve(__dirname, '../../../data/synthetic/held_out_eval_set');
  const paymentFile = path.join(evalDir, 'payment_gateway.csv');
  const bankFile = path.join(evalDir, 'bank_statement.csv');
  const orderFile = path.join(evalDir, 'orders.csv');
  const groundTruthFile = path.join(evalDir, 'ground_truth.json');

  if (!fs.existsSync(groundTruthFile)) {
    throw new Error(`Ground truth file not found at: ${groundTruthFile}`);
  }

  const groundTruth = JSON.parse(fs.readFileSync(groundTruthFile, 'utf-8'));

  // Create temporary UploadBatch for the eval run
  const evalBatch = await UploadBatch.create({
    paymentFile,
    bankFile,
    orderFile,
    status: 'processing',
  });

  const batchId = evalBatch._id.toString();

  // Execute Master Planner Agent Pipeline
  await runPipeline(batchId, {
    paymentFile,
    bankFile,
    orderFile,
  });

  // Fetch predictions
  const predictions = await Transaction.find({ batchId }).lean();

  // Compute metrics
  const results = computeMetrics(predictions, groundTruth.records || []);

  // Cleanup temporary eval batch to keep DB tidy
  await Transaction.deleteMany({ batchId });
  await UploadBatch.findByIdAndDelete(batchId);

  return results;
}

// Direct CLI invocation support: node tests/eval/runEval.js
if (process.argv[1] === __filename || process.argv[1]?.endsWith('runEval.js')) {
  (async () => {
    try {
      console.log('🚀 Running FinRecon AI Held-Out Evaluation Pipeline...');
      const results = await runHeldOutEvaluation();
      console.log(results.summaryText);
      process.exit(0);
    } catch (err) {
      console.error('❌ Evaluation failed:', err);
      process.exit(1);
    }
  })();
}

export default runHeldOutEvaluation;
