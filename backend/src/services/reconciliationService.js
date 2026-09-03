import fs from 'fs';
import path from 'path';
import { UploadBatch } from '../models/uploadBatch.model.js';
import { Transaction } from '../models/transaction.model.js';
import { parseCsv } from './ingestionService.js';
import { mapSchema } from '../core/schemaMapper.js';
import { matchExact } from '../core/matcher.js';
import { classifyException } from '../core/exceptionClassifier.js';
import { getPriority } from '../core/priorityEngine.js';

/**
 * Reconciliation Service
 * Runs the end-to-end reconciliation pipeline for a given batchId:
 * 1. Reads the 3 uploaded file paths from UploadBatch
 * 2. Ingests CSV files via ingestionService
 * 3. Maps schemas via schemaMapper
 * 4. Executes exact matching via matcher.matchExact
 * 5. Classifies unmatched records via exceptionClassifier + priorityEngine
 * 6. Persists Transaction documents using insertMany
 * 7. Updates UploadBatch status to completed / needs_manual_review
 *
 * @param {string} batchId - The ObjectId string of the UploadBatch
 * @param {object} [options={}] - Custom overrides or options
 * @returns {Promise<{ status: string, matched: number, exceptions: number, total: number }>}
 */
export async function reconcileBatch(batchId, options = {}) {
  const batch = await UploadBatch.findById(batchId);
  if (!batch) {
    throw new Error(`UploadBatch not found with ID: ${batchId}`);
  }

  // 1. Resolve file paths
  const paymentPath = options.paymentFile || batch.paymentFile;
  const bankPath = options.bankFile || batch.bankFile;
  const orderPath = options.orderFile || batch.orderFile;

  if (!paymentPath || !bankPath || !orderPath) {
    throw new Error('All 3 file paths (payment, bank, orders) are required for reconciliation.');
  }

  // 2. Ingestion
  const paymentRaw = parseCsv(paymentPath);
  const bankRaw = parseCsv(bankPath);
  const orderRaw = parseCsv(orderPath);

  // 3. Schema Mapping
  const payments = await mapSchema(paymentRaw, 'payment');
  const bank = await mapSchema(bankRaw, 'bank');
  const orders = await mapSchema(orderRaw, 'order');

  // 4. Exact Matching
  const slaHours = options.slaHours ?? (Number(process.env.SETTLEMENT_SLA_HOURS) || 2);
  const { matched, unmatched } = matchExact(payments, bank, orders, { slaHours });

  // 5. Build documents to persist
  const docsToInsert = [];

  for (const m of matched) {
    const priority = getPriority(m);
    docsToInsert.push({
      batchId,
      txnRef: m.txnRef,
      paymentAmount: m.paymentAmount,
      bankAmount: m.bankAmount,
      orderAmount: m.orderAmount,
      paymentTime: m.paymentTime ? new Date(m.paymentTime) : null,
      bankTime: m.bankTime ? new Date(m.bankTime) : null,
      orderTime: m.orderTime ? new Date(m.orderTime) : null,
      status: 'matched',
      confidence: 1.0,
      priority,
      explanation: 'Reconciled: matching reference, amounts, and SLA window verified across all three sources.',
      recommendedAction: 'None - Transaction reconciled successfully.',
    });
  }

  for (const u of unmatched) {
    const status = classifyException(u, { isDuplicate: u.isDuplicate, slaHours });
    const priority = getPriority(u);

    let explanation = '';
    let recommendedAction = '';

    switch (status) {
      case 'amount_mismatch':
        explanation = `Amount mismatch: Payment: ₹${u.paymentAmount ?? 0}, Bank: ₹${u.bankAmount ?? 0}, Order: ₹${u.orderAmount ?? 0}.`;
        recommendedAction = 'Verify invoice and payment gateway fee deductions with merchant.';
        break;
      case 'missing_settlement':
        explanation = 'Payment / order recorded but bank deposit entry is missing.';
        recommendedAction = 'Check payment gateway payout batch schedule or dispute with bank.';
        break;
      case 'unknown_credit':
        explanation = 'Direct bank deposit without corresponding payment or order reference.';
        recommendedAction = 'Identify depositor via bank narration UTR or request merchant confirmation.';
        break;
      case 'settlement_delay':
        explanation = `Bank deposit occurred after the standard ${slaHours}-hour SLA settlement window.`;
        recommendedAction = 'Review settlement SLA terms with gateway provider.';
        break;
      case 'duplicate':
        explanation = 'Transaction reference appears multiple times in source files.';
        recommendedAction = 'Check for duplicate payment charges or webhook retries.';
        break;
      default:
        explanation = 'Unclassified reconciliation exception.';
        recommendedAction = 'Manual finance review required.';
    }

    docsToInsert.push({
      batchId,
      txnRef: u.txnRef,
      paymentAmount: u.paymentAmount,
      bankAmount: u.bankAmount,
      orderAmount: u.orderAmount,
      paymentTime: u.paymentTime ? new Date(u.paymentTime) : null,
      bankTime: u.bankTime ? new Date(u.bankTime) : null,
      orderTime: u.orderTime ? new Date(u.orderTime) : null,
      status,
      confidence: 0.9,
      priority,
      explanation,
      recommendedAction,
    });
  }

  // 6. Delete previous transactions for this batch if re-running
  await Transaction.deleteMany({ batchId });

  // 7. Insert all transactions via insertMany
  if (docsToInsert.length > 0) {
    await Transaction.insertMany(docsToInsert);
  }

  // 8. Update UploadBatch status via findByIdAndUpdate
  const finalStatus = unmatched.length > 0 ? 'needs_manual_review' : 'completed';
  await UploadBatch.findByIdAndUpdate(batchId, { status: finalStatus });

  return {
    status: 'completed',
    matched: matched.length,
    exceptions: unmatched.length,
    total: docsToInsert.length,
  };
}

export default {
  reconcileBatch,
};
