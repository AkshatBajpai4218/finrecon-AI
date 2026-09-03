import stringSimilarity from 'string-similarity';
import { normalizeAmount, normalizeText } from './normalizer.js';

const compareTwoStrings = stringSimilarity.compareTwoStrings || stringSimilarity.default?.compareTwoStrings;

/**
 * Backward compatibility helpers
 */
export function exactMatch(left, right) {
  return (
    normalizeText(left.reference || left.txnRef) === normalizeText(right.reference || right.txnRef) &&
    normalizeAmount(left.amount) === normalizeAmount(right.amount)
  );
}

export function matchTransactions(source, candidates) {
  return candidates.find(candidate => exactMatch(source, candidate)) || null;
}

/**
 * Helper to compute timestamp difference in hours between two dates.
 */
function getHoursDiff(date1, date2) {
  if (!date1 || !date2) return null;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  return Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60);
}

/**
 * Prompt 1.3 — Exact matching engine
 */
export function matchExact(payments = [], bank = [], orders = [], options = {}) {
  const slaHours = options.slaHours ?? (Number(process.env.SETTLEMENT_SLA_HOURS) || 2);

  const paymentCounts = new Map();
  const bankCounts = new Map();
  const orderCounts = new Map();

  const paymentMap = new Map();
  const bankMap = new Map();
  const orderMap = new Map();

  const allRefs = new Set();

  for (const p of payments) {
    if (!p?.txnRef) continue;
    allRefs.add(p.txnRef);
    paymentCounts.set(p.txnRef, (paymentCounts.get(p.txnRef) || 0) + 1);
    if (!paymentMap.has(p.txnRef)) paymentMap.set(p.txnRef, p);
  }

  for (const b of bank) {
    if (!b?.txnRef) continue;
    allRefs.add(b.txnRef);
    bankCounts.set(b.txnRef, (bankCounts.get(b.txnRef) || 0) + 1);
    if (!bankMap.has(b.txnRef)) bankMap.set(b.txnRef, b);
  }

  for (const o of orders) {
    if (!o?.txnRef) continue;
    allRefs.add(o.txnRef);
    orderCounts.set(o.txnRef, (orderCounts.get(o.txnRef) || 0) + 1);
    if (!orderMap.has(o.txnRef)) orderMap.set(o.txnRef, o);
  }

  const matched = [];
  const unmatched = [];

  for (const ref of allRefs) {
    const p = paymentMap.get(ref);
    const b = bankMap.get(ref);
    const o = orderMap.get(ref);

    const hasPayment = p !== undefined && p !== null;
    const hasBank = b !== undefined && b !== null;
    const hasOrder = o !== undefined && o !== null;

    const paymentAmount = hasPayment ? p.amount : null;
    const bankAmount = hasBank ? b.amount : null;
    const orderAmount = hasOrder ? o.amount : null;

    const paymentTime = hasPayment ? p.time : null;
    const bankTime = hasBank ? b.time : null;
    const orderTime = hasOrder ? o.time : null;

    const isDuplicate =
      (paymentCounts.get(ref) || 0) > 1 ||
      (bankCounts.get(ref) || 0) > 1 ||
      (orderCounts.get(ref) || 0) > 1;

    const mergedRecord = {
      txnRef: ref,
      paymentAmount,
      bankAmount,
      orderAmount,
      paymentTime,
      bankTime,
      orderTime,
      description: p?.description || b?.description || o?.description || '',
      isDuplicate,
    };

    if (hasPayment && hasBank && hasOrder && !isDuplicate) {
      const amountsMatch =
        paymentAmount === bankAmount && bankAmount === orderAmount;

      let withinSla = true;
      if (paymentTime && bankTime) {
        const diffHours = getHoursDiff(paymentTime, bankTime);
        if (diffHours !== null && diffHours > slaHours) {
          withinSla = false;
        }
      }

      if (amountsMatch && withinSla) {
        matched.push({
          ...mergedRecord,
          status: 'matched',
          confidence: 1.0,
        });
        continue;
      }
    }

    unmatched.push(mergedRecord);
  }

  return { matched, unmatched };
}

/**
 * Computes weighted fuzzy similarity score between two candidate records.
 * score = 0.4*amountSimilarity + 0.3*referenceSimilarity + 0.2*timeProximity + 0.1*descriptionSimilarity
 *
 * @param {object} candidateA
 * @param {object} candidateB
 * @param {object} [options={}]
 * @returns {{ score: number, amountSimilarity: number, referenceSimilarity: number, timeProximity: number, descriptionSimilarity: number }}
 */
export function computeFuzzyScore(candidateA = {}, candidateB = {}, options = {}) {
  const slaHours = options.slaHours ?? (Number(process.env.SETTLEMENT_SLA_HOURS) || 2);

  // 1. amountSimilarity: 1 - (abs difference / max amount), floored at 0
  const amtA = Math.abs(Number(candidateA.amount ?? candidateA.paymentAmount ?? candidateA.bankAmount ?? 0));
  const amtB = Math.abs(Number(candidateB.amount ?? candidateB.bankAmount ?? candidateB.orderAmount ?? 0));
  const maxAmt = Math.max(amtA, amtB);
  const amountSimilarity = maxAmt === 0 ? 1 : Math.max(0, 1 - Math.abs(amtA - amtB) / maxAmt);

  // 2. referenceSimilarity: string-similarity (Dice coefficient) between txnRef strings
  const refA = String(candidateA.txnRef || candidateA.reference || '');
  const refB = String(candidateB.txnRef || candidateB.reference || '');
  let referenceSimilarity = 0;
  if (refA && refB && compareTwoStrings) {
    referenceSimilarity = compareTwoStrings(refA, refB);
  } else if (refA && refB && refA.toLowerCase() === refB.toLowerCase()) {
    referenceSimilarity = 1.0;
  }

  // 3. timeProximity: 1 if within SLA, decaying linearly to 0 at 2x SLA
  let timeProximity = 0.5;
  const timeA = candidateA.time || candidateA.paymentTime;
  const timeB = candidateB.time || candidateB.bankTime;
  if (timeA && timeB) {
    const diffHours = getHoursDiff(timeA, timeB);
    if (diffHours !== null) {
      if (diffHours <= slaHours) {
        timeProximity = 1;
      } else if (diffHours >= 2 * slaHours) {
        timeProximity = 0;
      } else {
        timeProximity = 1 - (diffHours - slaHours) / slaHours;
      }
    }
  }

  // 4. descriptionSimilarity: string-similarity approach on description fields
  const descA = String(candidateA.description || '');
  const descB = String(candidateB.description || '');
  let descriptionSimilarity = 0.5;
  if (descA && descB && compareTwoStrings) {
    descriptionSimilarity = compareTwoStrings(descA, descB);
  }

  const score =
    0.4 * amountSimilarity +
    0.3 * referenceSimilarity +
    0.2 * timeProximity +
    0.1 * descriptionSimilarity;

  return {
    score: Math.round(score * 1000) / 1000,
    amountSimilarity,
    referenceSimilarity,
    timeProximity,
    descriptionSimilarity,
  };
}

/**
 * Prompt 2.1 — Fuzzy matching engine
 *
 * For records that failed exact matching:
 * Computes weighted confidence score:
 *   score = 0.4*amountSimilarity + 0.3*referenceSimilarity + 0.2*timeProximity + 0.1*descriptionSimilarity
 * - score >= 0.90: treat as "matched" with that confidence
 * - score 0.70–0.89: mark as "likely_match" with that confidence
 * - score < 0.70: leave as a true exception for exceptionClassifier
 *
 * @param {Array<object>} unmatchedPayments
 * @param {Array<object>} unmatchedBank
 * @param {Array<object>} unmatchedOrders
 * @param {object} [options={}]
 * @returns {{ matched: Array<object>, likelyMatches: Array<object>, exceptions: Array<object> }}
 */
export function matchFuzzy(unmatchedPayments = [], unmatchedBank = [], unmatchedOrders = [], options = {}) {
  const matched = [];
  const likelyMatches = [];
  const exceptions = [];

  const usedBankIndices = new Set();
  const usedOrderIndices = new Set();

  for (const payment of unmatchedPayments) {
    let bestBankIdx = -1;
    let bestBankScore = -1;

    for (let i = 0; i < unmatchedBank.length; i++) {
      if (usedBankIndices.has(i)) continue;
      const bankRecord = unmatchedBank[i];
      const { score } = computeFuzzyScore(payment, bankRecord, options);
      if (score > bestBankScore) {
        bestBankScore = score;
        bestBankIdx = i;
      }
    }

    // Find closest matching order
    let bestOrderIdx = -1;
    let bestOrderScore = -1;
    for (let j = 0; j < unmatchedOrders.length; j++) {
      if (usedOrderIndices.has(j)) continue;
      const orderRecord = unmatchedOrders[j];
      const { score } = computeFuzzyScore(payment, orderRecord, options);
      if (score > bestOrderScore) {
        bestOrderScore = score;
        bestOrderIdx = j;
      }
    }

    const matchedBank = bestBankIdx !== -1 && bestBankScore >= 0.7 ? unmatchedBank[bestBankIdx] : null;
    const matchedOrder = bestOrderIdx !== -1 && bestOrderScore >= 0.7 ? unmatchedOrders[bestOrderIdx] : null;

    if (matchedBank) usedBankIndices.add(bestBankIdx);
    if (matchedOrder) usedOrderIndices.add(bestOrderIdx);

    const primaryScore = matchedBank ? bestBankScore : (matchedOrder ? bestOrderScore : 0);

    const merged = {
      txnRef: payment.txnRef || matchedBank?.txnRef || matchedOrder?.txnRef,
      paymentAmount: payment.amount ?? payment.paymentAmount ?? null,
      bankAmount: matchedBank ? (matchedBank.amount ?? matchedBank.bankAmount) : null,
      orderAmount: matchedOrder ? (matchedOrder.amount ?? matchedOrder.orderAmount) : null,
      paymentTime: payment.time ?? payment.paymentTime ?? null,
      bankTime: matchedBank ? (matchedBank.time ?? matchedBank.bankTime) : null,
      orderTime: matchedOrder ? (matchedOrder.time ?? matchedOrder.orderTime) : null,
      confidence: primaryScore > 0 ? primaryScore : 0.5,
    };

    if (primaryScore >= 0.90) {
      matched.push({ ...merged, status: 'matched' });
    } else if (primaryScore >= 0.70) {
      likelyMatches.push({ ...merged, status: 'likely_match' });
    } else {
      exceptions.push(merged);
    }
  }

  // Any leftover bank records not matched to any payment
  unmatchedBank.forEach((b, idx) => {
    if (!usedBankIndices.has(idx)) {
      exceptions.push({
        txnRef: b.txnRef,
        paymentAmount: null,
        bankAmount: b.amount ?? b.bankAmount ?? null,
        orderAmount: null,
        paymentTime: null,
        bankTime: b.time ?? b.bankTime ?? null,
        orderTime: null,
        confidence: 0.5,
      });
    }
  });

  return {
    matched,
    likelyMatches,
    exceptions,
    unmatched: [...likelyMatches, ...exceptions],
  };
}

export default {
  exactMatch,
  matchTransactions,
  matchExact,
  computeFuzzyScore,
  matchFuzzy,
};
