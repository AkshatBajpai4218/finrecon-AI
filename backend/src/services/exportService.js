import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import { computeBatchReportStats, runReportingAgent } from '../agents/reportingAgent.js';
import { logAction } from './auditService.js';

/**
 * FinRecon AI - Export Service
 * Generates downloadable PDF executive summaries and CSV transaction exports.
 */

/**
 * Generates a styled PDF report buffer for a batch.
 * @param {string} batchId
 * @returns {Promise<Buffer>}
 */
export async function generateBatchPdfReport(batchId) {
  const { stats, narrative } = await runReportingAgent(batchId);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', async () => {
        const pdfData = Buffer.concat(buffers);
        await logAction(batchId, 'REPORT_EXPORTED_PDF', 'User', {
          batchId,
          sizeBytes: pdfData.length,
        });
        resolve(pdfData);
      });

      // Title & Branding
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#0f172a').text('FinRecon AI', 40, 40);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#2563eb').text('Autonomous Financial Reconciliation Summary', 40, 68);
      doc.moveDown(0.5);

      // Metadata Bar
      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(`Batch ID: ${batchId}  |  Generated: ${new Date().toLocaleString()}  |  Engine: Multi-Agent v2.0`);
      doc.moveDown(1);
      doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // Key Metrics Grid
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('EXECUTIVE RECONCILIATION SUMMARY');
      doc.moveDown(0.5);

      const yStart = doc.y;
      doc.fontSize(9).font('Helvetica').fillColor('#334155');
      doc.text(`Total Transactions: ${stats.total}`, 40, yStart);
      doc.text(`Matched Rate: ${stats.matchRate}% (${stats.matched} matched)`, 200, yStart);
      doc.text(`Total Exceptions: ${stats.exceptions}`, 380, yStart);

      doc.text(`Total Risk Exposure: Rs. ${stats.totalExposure.toLocaleString('en-IN')}`, 40, yStart + 18);
      doc.text(`High/Critical Priority: ${stats.highPriorityCount}`, 200, yStart + 18);
      doc.text(`Settlement Delays: ${stats.delayedCount}`, 380, yStart + 18);

      doc.moveDown(2.5);

      // AI Narrative Section
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('AI CONTROLLER NARRATIVE');
      doc.moveDown(0.4);
      doc.fontSize(9.5).font('Helvetica-Oblique').fillColor('#1e293b').text(narrative, {
        align: 'justify',
        lineGap: 3,
      });

      doc.moveDown(1.5);
      doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // Exception Table
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('FLAGGED EXCEPTIONS BREAKDOWN');
      doc.moveDown(0.5);

      // Table Header
      const headerY = doc.y;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569');
      doc.text('REFERENCE', 40, headerY);
      doc.text('STATUS', 130, headerY);
      doc.text('PRIORITY', 240, headerY);
      doc.text('PAYMENT', 320, headerY);
      doc.text('BANK', 400, headerY);
      doc.text('ORDER', 480, headerY);

      doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(40, headerY + 12).lineTo(555, headerY + 12).stroke();

      let rowY = headerY + 18;
      const exceptions = stats.exceptionsList.slice(0, 30); // Top 30 for PDF fit

      doc.font('Helvetica').fontSize(7.5).fillColor('#1e293b');

      for (const ex of exceptions) {
        if (rowY > 760) {
          doc.addPage();
          rowY = 40;
        }

        doc.text(String(ex.txnRef || '').slice(0, 14), 40, rowY);
        doc.text(String(ex.status || '').replace(/_/g, ' '), 130, rowY);
        doc.text(String(ex.priority || '').toUpperCase(), 240, rowY);
        doc.text(ex.paymentAmount != null ? `Rs.${ex.paymentAmount}` : '-', 320, rowY);
        doc.text(ex.bankAmount != null ? `Rs.${ex.bankAmount}` : '-', 400, rowY);
        doc.text(ex.orderAmount != null ? `Rs.${ex.orderAmount}` : '-', 480, rowY);

        rowY += 16;
      }

      if (stats.exceptionsList.length > 30) {
        doc.fontSize(7).fillColor('#64748b').text(`...and ${stats.exceptionsList.length - 30} additional exceptions. Please refer to CSV export.`, 40, rowY + 5);
      }

      // Footer
      doc.fontSize(7).fillColor('#94a3b8').text('Confidential - Generated autonomously by FinRecon AI Multi-Agent Controller', 40, 800, {
        align: 'center',
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generates raw CSV export of all transactions in a batch using json2csv.
 * @param {string} batchId
 * @returns {Promise<string>}
 */
export async function generateBatchCsvReport(batchId) {
  const stats = await computeBatchReportStats(batchId);

  const fields = [
    { label: 'Transaction Reference', value: 'txnRef' },
    { label: 'Reconciliation Status', value: 'status' },
    { label: 'Priority', value: 'priority' },
    { label: 'Confidence Score', value: 'confidence' },
    { label: 'Payment Gateway Amount', value: 'paymentAmount' },
    { label: 'Payment Timestamp', value: 'paymentTime' },
    { label: 'Bank Statement Amount', value: 'bankAmount' },
    { label: 'Bank Timestamp', value: 'bankTime' },
    { label: 'Orders Amount', value: 'orderAmount' },
    { label: 'Order Timestamp', value: 'orderTime' },
    { label: 'AI Root Cause Explanation', value: 'explanation' },
    { label: 'Recommended Action', value: 'recommendedAction' },
  ];

  const parser = new Parser({ fields });
  const csv = parser.parse(stats.allTransactions);

  await logAction(batchId, 'REPORT_EXPORTED_CSV', 'User', {
    batchId,
    rowsCount: stats.allTransactions.length,
  });

  return csv;
}

export default {
  generateBatchPdfReport,
  generateBatchCsvReport,
};
