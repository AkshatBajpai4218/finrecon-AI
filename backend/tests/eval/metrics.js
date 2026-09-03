/**
 * FinRecon AI - Evaluation Metrics Engine
 * Computes match accuracy, precision, recall, and breakdown per exception category.
 */

function normalizeStatus(status) {
  const s = String(status || '').toLowerCase().trim();
  if (s === 'mismatch') return 'amount_mismatch';
  if (s === 'delay') return 'settlement_delay';
  return s;
}

/**
 * Computes evaluation metrics comparing predicted classifications with ground truth.
 *
 * @param {Array<{ txnRef: string, status: string }>} predictions
 * @param {Array<{ txnRef: string, expectedStatus: string, category: string }>} groundTruth
 * @returns {object} Evaluation results & formatted summary
 */
export function computeMetrics(predictions = [], groundTruth = []) {
  const predMap = new Map();
  for (const p of predictions) {
    predMap.set(p.txnRef, normalizeStatus(p.status));
  }

  const total = groundTruth.length;
  let correctTotal = 0;

  // Counters for Exception Detection (Binary: Exception vs Matched)
  let tpExceptions = 0; // correctly identified as exception
  let fpExceptions = 0; // false alarm: matched predicted as exception
  let fnExceptions = 0; // missed: exception predicted as matched
  let tnExceptions = 0; // correctly identified as matched

  // Per-category counts: { tp, fp, fn, support }
  const categoryStats = {};

  for (const item of groundTruth) {
    const expected = normalizeStatus(item.expectedStatus || item.category);
    const predicted = predMap.get(item.txnRef) || 'missing_in_predictions';

    if (!categoryStats[expected]) {
      categoryStats[expected] = { tp: 0, fp: 0, fn: 0, support: 0 };
    }
    categoryStats[expected].support++;

    const isMatchCorrect = predicted === expected;
    if (isMatchCorrect) {
      correctTotal++;
      categoryStats[expected].tp++;
    } else {
      categoryStats[expected].fn++;
      if (!categoryStats[predicted]) {
        categoryStats[predicted] = { tp: 0, fp: 0, fn: 0, support: 0 };
      }
      categoryStats[predicted].fp++;
    }

    const isActualException = expected !== 'matched';
    const isPredException = predicted !== 'matched';

    if (isActualException && isPredException) tpExceptions++;
    else if (!isActualException && isPredException) fpExceptions++;
    else if (isActualException && !isPredException) fnExceptions++;
    else if (!isActualException && !isPredException) tnExceptions++;
  }

  const accuracy = total > 0 ? Number(((correctTotal / total) * 100).toFixed(1)) : 0;
  const exceptionPrecision = (tpExceptions + fpExceptions) > 0
    ? Number(((tpExceptions / (tpExceptions + fpExceptions)) * 100).toFixed(1))
    : 100.0;
  const exceptionRecall = (tpExceptions + fnExceptions) > 0
    ? Number(((tpExceptions / (tpExceptions + fnExceptions)) * 100).toFixed(1))
    : 100.0;

  const summaryText = `
==================================================
           FINRECON AI EVALUATION REPORT
==================================================
Total test records:              ${total}
Correctly classified:            ${correctTotal}
Incorrectly classified:          ${total - correctTotal}
Overall Classification Accuracy: ${accuracy}%
--------------------------------------------------
Exception Detection Precision:   ${exceptionPrecision}%
Exception Detection Recall:      ${exceptionRecall}%
==================================================
`;

  return {
    total,
    correctTotal,
    incorrect: total - correctTotal,
    accuracy,
    exceptionPrecision,
    exceptionRecall,
    categoryStats,
    summaryText,
  };
}

export default {
  computeMetrics,
};
