import { generateBatchPdfReport, generateBatchCsvReport } from '../services/exportService.js';
import { runReportingAgent } from '../agents/reportingAgent.js';
import { getAuditLogs } from '../services/auditService.js';
import { UploadBatch } from '../models/uploadBatch.model.js';

/**
 * GET /api/reports/:batchId?format=pdf|csv
 * Generates and downloads financial reports or returns summary JSON.
 */
export async function getReport(req, res, next) {
  try {
    let { batchId } = req.params;
    const format = String(req.query.format || '').toLowerCase();

    if (!batchId) {
      const latest = await UploadBatch.findOne().sort({ createdAt: -1 });
      if (!latest) {
        return res.status(404).json({ error: 'No reconciliation batches found.' });
      }
      batchId = latest._id.toString();
    }

    if (format === 'pdf') {
      const pdfBuffer = await generateBatchPdfReport(batchId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="FinRecon_Report_${batchId}.pdf"`);
      return res.send(pdfBuffer);
    }

    if (format === 'csv') {
      const csvString = await generateBatchCsvReport(batchId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="FinRecon_Transactions_${batchId}.csv"`);
      return res.send(csvString);
    }

    // Default: JSON Summary
    const result = await runReportingAgent(batchId);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/:batchId/audit
 * Returns chronological audit trail events for a batch.
 */
export async function getBatchAuditTrail(req, res, next) {
  try {
    let { batchId } = req.params;
    if (!batchId) {
      const latest = await UploadBatch.findOne().sort({ createdAt: -1 });
      if (latest) batchId = latest._id.toString();
    }

    const logs = await getAuditLogs(batchId);
    return res.status(200).json({
      batchId,
      totalEntries: logs.length,
      auditLogs: logs,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getReport,
  getBatchAuditTrail,
};
