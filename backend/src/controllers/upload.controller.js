import { UploadBatch } from '../models/uploadBatch.model.js';
import { logAction } from '../services/auditService.js';
import { parseFile } from '../services/ingestionService.js';

/**
 * POST /api/upload
 * Accepts 3 files (payment, bank, orders) in CSV or PDF formats.
 * Creates an UploadBatch in MongoDB, saves files to ./uploads, logs to audit trail,
 * and returns batchId.
 */
export async function uploadFiles(req, res, next) {
  try {
    const rawFiles = Array.isArray(req.files)
      ? req.files
      : Object.values(req.files || {}).flat();

    if (!rawFiles || rawFiles.length < 3) {
      return res.status(400).json({
        error: 'Three files are required: payment gateway, bank statement, and orders.',
      });
    }

    const payment = rawFiles.find(
      f => f.fieldname === 'payment' || f.fieldname === 'paymentFile' || /payment/i.test(f.originalname)
    ) || rawFiles[0];

    const bank = rawFiles.find(
      f => f.fieldname === 'bank' || f.fieldname === 'bankFile' || /bank/i.test(f.originalname)
    ) || rawFiles[1];

    const orders = rawFiles.find(
      f => f.fieldname === 'orders' || f.fieldname === 'order' || f.fieldname === 'orderFile' || /order/i.test(f.originalname)
    ) || rawFiles[2];

    let batchStatus = 'processing';
    let pdfWarning = null;

    // Prompt 3.5: PDF ingestion confidence check for bank statement
    if (/\.pdf$/i.test(bank.originalname) || bank.mimetype === 'application/pdf') {
      try {
        const parsedBank = await parseFile(bank.path, bank.originalname);
        if (parsedBank.isLowConfidence) {
          batchStatus = 'needs_manual_review';
          pdfWarning = parsedBank.warning;
        }
      } catch (pdfErr) {
        console.warn(`[Upload] PDF bank statement inspection warning: ${pdfErr.message}`);
      }
    }

    const batch = await UploadBatch.create({
      paymentFile: payment.path,
      bankFile: bank.path,
      orderFile: orders.path,
      status: batchStatus,
    });

    const batchId = batch._id.toString();

    // Prompt 3.6: Record file upload in audit trail
    await logAction(batchId, 'FILE_UPLOAD_COMPLETED', 'User/Merchant', {
      payment: payment.originalname,
      bank: bank.originalname,
      orders: orders.originalname,
      status: batchStatus,
      pdfWarning,
    });

    return res.status(201).json({
      batchId,
      status: batch.status,
      warning: pdfWarning,
      files: {
        payment: payment.originalname,
        bank: bank.originalname,
        orders: orders.originalname,
      },
    });
  } catch (err) {
    next(err);
  }
}

export default {
  uploadFiles,
};
