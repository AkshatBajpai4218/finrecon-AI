import { parseFile } from '../services/ingestionService.js';
import { mapSchema } from '../core/schemaMapper.js';

/**
 * FinRecon AI - Data Agent
 * Responsible for ingesting raw CSV/PDF files, detecting schemas,
 * mapping canonical fields, and standardizing currencies, dates, and references.
 *
 * @param {object} filePaths - { paymentFile, bankFile, orderFile }
 * @param {object} [options={}]
 * @returns {Promise<{ payments: Array<object>, bank: Array<object>, orders: Array<object> }>}
 */
export async function runDataAgent(filePaths = {}, options = {}) {
  const { paymentFile, bankFile, orderFile } = filePaths;

  if (!paymentFile || !bankFile || !orderFile) {
    throw new Error('DataAgent requires paymentFile, bankFile, and orderFile paths.');
  }

  // 1. Ingestion (supports CSV and PDF)
  const paymentData = await parseFile(paymentFile);
  const bankData = await parseFile(bankFile);
  const orderData = await parseFile(orderFile);

  // 2. Schema Mapping & Normalization
  const payments = await mapSchema(paymentData.rows, 'payment', options);
  const bank = await mapSchema(bankData.rows, 'bank', options);
  const orders = await mapSchema(orderData.rows, 'order', options);

  return {
    payments,
    bank,
    orders,
    metrics: {
      paymentCount: payments.length,
      bankCount: bank.length,
      orderCount: orders.length,
      bankIsPdf: bankData.isPdf,
      lowConfidenceWarning: bankData.warning,
    },
  };
}

export default {
  runDataAgent,
};
