import { classifyException } from '../src/core/exceptionClassifier.js';
import { getPriority, priorityFor } from '../src/core/priorityEngine.js';

describe('Exception Classifier - classifyException', () => {
  test('classifies duplicate regardless of other fields if flag is passed', () => {
    const record = {
      txnRef: 'TXN1001',
      paymentAmount: 1000,
      bankAmount: 1000,
      orderAmount: 1000,
    };
    expect(classifyException(record, { isDuplicate: true })).toBe('duplicate');
    expect(classifyException({ ...record, isDuplicate: true })).toBe('duplicate');
  });

  test('classifies unknown_credit when bank is present but payment and order are null', () => {
    const record = {
      txnRef: 'TXN1002',
      paymentAmount: null,
      bankAmount: 2500,
      orderAmount: null,
    };
    expect(classifyException(record)).toBe('unknown_credit');
  });

  test('classifies missing_settlement when payment and order are present but bank is null', () => {
    const record = {
      txnRef: 'TXN1003',
      paymentAmount: 5000,
      bankAmount: null,
      orderAmount: 5000,
    };
    expect(classifyException(record)).toBe('missing_settlement');
  });

  test('classifies amount_mismatch when all three sources are present but amounts differ', () => {
    const record = {
      txnRef: 'TXN1004',
      paymentAmount: 1000,
      bankAmount: 1000,
      orderAmount: 1200, // order differs
    };
    expect(classifyException(record)).toBe('amount_mismatch');
  });

  test('classifies settlement_delay when amounts match but bankTime exceeds paymentTime by SLA', () => {
    const record = {
      txnRef: 'TXN1005',
      paymentAmount: 3000,
      bankAmount: 3000,
      orderAmount: 3000,
      paymentTime: '2026-09-04 10:00:00',
      bankTime: '2026-09-04 20:00:00', // 10 hours later (> 2 hours SLA)
    };
    expect(classifyException(record, { slaHours: 2 })).toBe('settlement_delay');
  });
});

describe('Priority Engine - getPriority', () => {
  test('returns critical for amounts >= 50,000', () => {
    expect(getPriority(50000)).toBe('critical');
    expect(getPriority(75000)).toBe('critical');
    expect(getPriority({ paymentAmount: 50000, bankAmount: 1000, orderAmount: 1000 })).toBe('critical');
  });

  test('returns high for amounts between 10,000 and 49,999', () => {
    expect(getPriority(10000)).toBe('high');
    expect(getPriority(49999)).toBe('high');
    expect(getPriority({ paymentAmount: 5000, bankAmount: 12000, orderAmount: 5000 })).toBe('high');
  });

  test('returns medium for amounts between 1,000 and 9,999', () => {
    expect(getPriority(1000)).toBe('medium');
    expect(getPriority(9999)).toBe('medium');
    expect(getPriority({ paymentAmount: 500, bankAmount: 500, orderAmount: 2500 })).toBe('medium');
  });

  test('returns low for amounts < 1,000', () => {
    expect(getPriority(999)).toBe('low');
    expect(getPriority(300)).toBe('low');
    expect(getPriority(0)).toBe('low');
  });

  test('legacy priorityFor works', () => {
    expect(priorityFor({ amount: 100000 })).toBe('Critical');
  });
});
