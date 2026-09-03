/**
 * FinRecon AI - Rule-Based Exception Classifier
 *
 * Classifies an unmatched merged record from matcher.js into one of:
 * - "duplicate": txnRef appeared more than once in a source
 * - "unknown_credit": bank present, both payment and order are null
 * - "missing_settlement": payment and order present, bank amount is null
 * - "settlement_delay": all amounts equal but bankTime - paymentTime > SLA hours (default 2)
 * - "amount_mismatch": all three sources present but amounts differ
 *
 * @param {object} record - Unmatched record { txnRef, paymentAmount, bankAmount, orderAmount, paymentTime, bankTime, orderTime, isDuplicate }
 * @param {object} [options={}] - Options e.g. { isDuplicate: boolean, slaHours: number }
 * @returns {"duplicate" | "unknown_credit" | "missing_settlement" | "settlement_delay" | "amount_mismatch"}
 */
export function classifyException(record = {}, options = {}) {
  // 1. Duplicate check (flag passed in options or record.isDuplicate)
  if (options.isDuplicate || record.isDuplicate) {
    return 'duplicate';
  }

  const hasPayment = record.paymentAmount !== null && record.paymentAmount !== undefined;
  const hasBank = record.bankAmount !== null && record.bankAmount !== undefined;
  const hasOrder = record.orderAmount !== null && record.orderAmount !== undefined;

  // 2. Unknown credit: bank present, both payment and order are null
  if (hasBank && !hasPayment && !hasOrder) {
    return 'unknown_credit';
  }

  // 3. Missing settlement: payment and order present, bank amount is null
  if (hasPayment && hasOrder && !hasBank) {
    return 'missing_settlement';
  }

  // 4. Missing payment: bank and order present, payment missing
  if (hasBank && hasOrder && !hasPayment) {
    return 'missing_settlement'; // or bank without payment reconciliation
  }

  // 5. If all three sources exist
  if (hasPayment && hasBank && hasOrder) {
    const amountsMatch =
      record.paymentAmount === record.bankAmount &&
      record.bankAmount === record.orderAmount;

    // Check settlement delay: amounts equal, but bankTime - paymentTime > SLA
    if (amountsMatch) {
      const slaHours = options.slaHours ?? (Number(process.env.SETTLEMENT_SLA_HOURS) || 2);
      if (record.paymentTime && record.bankTime) {
        const pTime = new Date(record.paymentTime).getTime();
        const bTime = new Date(record.bankTime).getTime();
        if (!isNaN(pTime) && !isNaN(bTime)) {
          const diffHours = Math.abs(bTime - pTime) / (1000 * 60 * 60);
          if (diffHours > slaHours) {
            return 'settlement_delay';
          }
        }
      }
    }

    // Amounts differ across sources
    if (!amountsMatch) {
      return 'amount_mismatch';
    }
  }

  // Fallback defaults for missing / mismatch cases
  if (!hasBank) return 'missing_settlement';
  if (!hasPayment && !hasOrder) return 'unknown_credit';
  return 'amount_mismatch';
}

export default classifyException;
