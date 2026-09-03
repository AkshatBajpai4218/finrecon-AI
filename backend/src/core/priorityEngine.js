/**
 * FinRecon AI - Priority Engine
 *
 * Assigns an audit and resolution priority tier based on financial exposure:
 * - "critical": >= 50,000
 * - "high": 10,000 to 49,999
 * - "medium": 1,000 to 9,999
 * - "low": < 1,000
 *
 * If a merged record object is provided, evaluates the largest of the three amounts.
 *
 * @param {number|object} input - An amount number or record with { paymentAmount, bankAmount, orderAmount }
 * @returns {"critical" | "high" | "medium" | "low"}
 */
export function getPriority(input) {
  let amount = 0;

  if (typeof input === 'number') {
    amount = isNaN(input) ? 0 : Math.abs(input);
  } else if (input && typeof input === 'object') {
    const pAmt = Math.abs(Number(input.paymentAmount) || 0);
    const bAmt = Math.abs(Number(input.bankAmount) || 0);
    const oAmt = Math.abs(Number(input.orderAmount) || 0);
    amount = Math.max(pAmt, bAmt, oAmt);
  } else if (typeof input === 'string') {
    amount = Math.abs(parseFloat(input.replace(/[^0-9.-]/g, '')) || 0);
  }

  if (amount >= 50000) return 'critical';
  if (amount >= 10000) return 'high';
  if (amount >= 1000) return 'medium';
  return 'low';
}

/**
 * Backward compatibility helper
 */
export function priorityFor({ amount = 0, confidence = 1 } = {}) {
  const p = getPriority(amount);
  // capitalize for legacy code if needed
  return p.charAt(0).toUpperCase() + p.slice(1);
}

export default {
  getPriority,
  priorityFor,
};
