import { matchExact, matchFuzzy } from '../core/matcher.js';

/**
 * FinRecon AI - Reconciliation Agent
 * Executes exact matching, then fuzzy matching on orphaned/unpaired records.
 *
 * @param {Array<object>} payments - Normalized payment records
 * @param {Array<object>} bank - Normalized bank records
 * @param {Array<object>} orders - Normalized order records
 * @param {object} [options={}]
 * @returns {{ matched: Array<object>, likelyMatches: Array<object>, exceptions: Array<object>, allUnmatched: Array<object> }}
 */
export function runReconciliationAgent(payments = [], bank = [], orders = [], options = {}) {
  // 1. Exact Matching Pass
  const exactResult = matchExact(payments, bank, orders, options);

  // Separate exact result into:
  // - Clean matched
  // - Definite exceptions (already have matching txnRef across sources, e.g. amount mismatch or delay or duplicate)
  // - Candidates for fuzzy matching (missing bank or missing payment, where reference might be fuzzy like TXN_1042 vs UPI-1042)
  const definiteExceptions = [];
  const orphanPayments = [];
  const orphanBank = [];
  const orphanOrders = [];

  for (const item of exactResult.unmatched) {
    const hasP = item.paymentAmount !== null && item.paymentAmount !== undefined;
    const hasB = item.bankAmount !== null && item.bankAmount !== undefined;
    const hasO = item.orderAmount !== null && item.orderAmount !== undefined;

    // If duplicate or all 3 sources already present with differing amounts -> definite exception
    if (item.isDuplicate || (hasP && hasB && hasO)) {
      definiteExceptions.push(item);
    } else {
      // Partial source matches — could be fuzzy reference variation
      if (hasP && !hasB) {
        orphanPayments.push({
          txnRef: item.txnRef,
          amount: item.paymentAmount,
          time: item.paymentTime,
          description: item.description,
        });
      }
      if (hasB && !hasP) {
        orphanBank.push({
          txnRef: item.txnRef,
          amount: item.bankAmount,
          time: item.bankTime,
          description: item.description,
        });
      }
      if (hasO && !hasP && !hasB) {
        orphanOrders.push({
          txnRef: item.txnRef,
          amount: item.orderAmount,
          time: item.orderTime,
          description: item.description,
        });
      }
      // If payment and order present, but bank missing: orphanPayment can match orphanBank
      if (hasP && hasO && !hasB) {
        // already added to orphanPayments
      }
    }
  }

  // 2. Fuzzy Matching Pass on orphaned candidates
  let fuzzyMatched = [];
  let likelyMatches = [];
  let fuzzyExceptions = [];

  if (orphanPayments.length > 0 || orphanBank.length > 0) {
    const fuzzyRes = matchFuzzy(orphanPayments, orphanBank, orphanOrders, options);
    fuzzyMatched = fuzzyRes.matched || [];
    likelyMatches = fuzzyRes.likelyMatches || [];
    fuzzyExceptions = fuzzyRes.exceptions || [];
  }

  const totalMatched = [...exactResult.matched, ...fuzzyMatched];
  const allExceptions = [...definiteExceptions, ...fuzzyExceptions];

  return {
    matched: totalMatched,
    likelyMatches,
    exceptions: allExceptions,
    allUnmatched: [...likelyMatches, ...allExceptions],
  };
}

export default {
  runReconciliationAgent,
};
