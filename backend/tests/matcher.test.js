import { matchExact, matchFuzzy, computeFuzzyScore, exactMatch, matchTransactions } from '../src/core/matcher.js';

describe('Matcher - matchExact', () => {
  const fixturePayments = [
    { txnRef: 'TXN1001', amount: 1000, time: '2026-09-04 10:00:00' }, // perfect match
    { txnRef: 'TXN1002', amount: 2000, time: '2026-09-04 10:00:00' }, // amount mismatch
    { txnRef: 'TXN1003', amount: 3000, time: '2026-09-04 10:00:00' }, // missing bank
  ];

  const fixtureBank = [
    { txnRef: 'TXN1001', amount: 1000, time: '2026-09-04 10:45:00' }, // perfect match
    { txnRef: 'TXN1002', amount: 2000, time: '2026-09-04 10:45:00' }, // amount mismatch (order differs)
    // TXN1003 missing in bank
  ];

  const fixtureOrders = [
    { txnRef: 'TXN1001', amount: 1000, time: '2026-09-04 09:55:00' }, // perfect match
    { txnRef: 'TXN1002', amount: 2500, time: '2026-09-04 09:55:00' }, // order amount is 2500 (differs)
    { txnRef: 'TXN1003', amount: 3000, time: '2026-09-04 09:55:00' }, // missing bank
  ];

  test('correctly identifies perfect match, amount mismatch, and missing source', () => {
    const { matched, unmatched } = matchExact(fixturePayments, fixtureBank, fixtureOrders, { slaHours: 2 });

    expect(matched).toHaveLength(1);
    expect(matched[0].txnRef).toBe('TXN1001');
    expect(matched[0].status).toBe('matched');
    expect(matched[0].confidence).toBe(1.0);
    expect(matched[0].paymentAmount).toBe(1000);
    expect(matched[0].bankAmount).toBe(1000);
    expect(matched[0].orderAmount).toBe(1000);

    expect(unmatched).toHaveLength(2);

    const mismatch = unmatched.find(u => u.txnRef === 'TXN1002');
    expect(mismatch).toBeDefined();
    expect(mismatch.paymentAmount).toBe(2000);
    expect(mismatch.orderAmount).toBe(2500);

    const missingBank = unmatched.find(u => u.txnRef === 'TXN1003');
    expect(missingBank).toBeDefined();
    expect(missingBank.bankAmount).toBeNull();
    expect(missingBank.paymentAmount).toBe(3000);
  });

  test('flags settlement delay exceeding SLA as unmatched', () => {
    const payments = [{ txnRef: 'TXN999', amount: 500, time: '2026-09-04 08:00:00' }];
    const bank = [{ txnRef: 'TXN999', amount: 500, time: '2026-09-04 20:00:00' }]; // 12 hrs later
    const orders = [{ txnRef: 'TXN999', amount: 500, time: '2026-09-04 07:55:00' }];

    const { matched, unmatched } = matchExact(payments, bank, orders, { slaHours: 2 });
    expect(matched).toHaveLength(0);
    expect(unmatched).toHaveLength(1);
    expect(unmatched[0].txnRef).toBe('TXN999');
  });

  test('flags duplicates within a single source as unmatched', () => {
    const payments = [
      { txnRef: 'TXN888', amount: 500, time: '2026-09-04 08:00:00' },
      { txnRef: 'TXN888', amount: 500, time: '2026-09-04 08:02:00' }, // duplicate in payment
    ];
    const bank = [{ txnRef: 'TXN888', amount: 500, time: '2026-09-04 08:30:00' }];
    const orders = [{ txnRef: 'TXN888', amount: 500, time: '2026-09-04 07:55:00' }];

    const { matched, unmatched } = matchExact(payments, bank, orders, { slaHours: 2 });
    expect(matched).toHaveLength(0);
    expect(unmatched).toHaveLength(1);
    expect(unmatched[0].isDuplicate).toBe(true);
  });

  test('backward compatibility - exactMatch and matchTransactions', () => {
    expect(exactMatch({ reference: 'TX-1', amount: '100' }, { reference: 'tx-1', amount: 100 })).toBe(true);
    const candidate = matchTransactions({ reference: 'TX-1', amount: '100' }, [{ reference: 'tx-1', amount: 100 }]);
    expect(candidate).not.toBeNull();
  });
});

describe('Matcher - matchFuzzy', () => {
  test('correctly scores and flags "TXN_1042 vs UPI-1042" fuzzy reference case as likely_match', () => {
    const payment = {
      txnRef: 'TXN_1042',
      amount: 1500,
      time: '2026-09-04 10:00:00',
      description: 'UPI Payout',
    };

    const bank = {
      txnRef: 'UPI-1042',
      amount: 1500,
      time: '2026-09-04 10:30:00', // within 2h SLA
      description: 'UPI Settlement',
    };

    const result = computeFuzzyScore(payment, bank, { slaHours: 2 });

    // Amount match: 1.0 (weight 0.4 -> 0.4)
    expect(result.amountSimilarity).toBe(1.0);
    // Time within SLA: 1.0 (weight 0.2 -> 0.2)
    expect(result.timeProximity).toBe(1.0);
    // Reference dice similarity between TXN_1042 and UPI-1042
    expect(result.referenceSimilarity).toBeGreaterThan(0.35);
    // Total score should be in 0.70 - 0.89 range
    expect(result.score).toBeGreaterThanOrEqual(0.70);
    expect(result.score).toBeLessThan(0.90);

    const fuzzyRes = matchFuzzy([payment], [bank], []);
    expect(fuzzyRes.likelyMatches).toHaveLength(1);
    expect(fuzzyRes.likelyMatches[0].status).toBe('likely_match');
    expect(fuzzyRes.likelyMatches[0].confidence).toBe(result.score);
  });

  test('classifies high-confidence fuzzy match (>= 0.90) as matched', () => {
    const payment = {
      txnRef: 'TXN-1042',
      amount: 1500,
      time: '2026-09-04 10:00:00',
      description: 'Razorpay payout',
    };

    const bank = {
      txnRef: 'TXN-1042',
      amount: 1500,
      time: '2026-09-04 10:15:00',
      description: 'Razorpay payout',
    };

    const fuzzyRes = matchFuzzy([payment], [bank], []);
    expect(fuzzyRes.matched).toHaveLength(1);
    expect(fuzzyRes.matched[0].status).toBe('matched');
    expect(fuzzyRes.matched[0].confidence).toBeGreaterThanOrEqual(0.90);
  });

  test('leaves low-confidence candidates (< 0.70) in exceptions', () => {
    const payment = {
      txnRef: 'TXN-9999',
      amount: 5000,
      time: '2026-09-04 10:00:00',
    };

    const bank = {
      txnRef: 'UNRECOGNIZED-ABC',
      amount: 1200, // completely different amount & reference
      time: '2026-09-04 22:00:00',
    };

    const fuzzyRes = matchFuzzy([payment], [bank], []);
    expect(fuzzyRes.matched).toHaveLength(0);
    expect(fuzzyRes.likelyMatches).toHaveLength(0);
    expect(fuzzyRes.exceptions.length).toBeGreaterThan(0);
  });
});
