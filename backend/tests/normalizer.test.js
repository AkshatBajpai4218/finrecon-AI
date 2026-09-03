import { normalizeAmount, normalizeDate, normalizeText } from '../src/core/normalizer.js';

describe('Normalizer - normalizeAmount', () => {
  test('converts currency with Rupee symbol e.g. "₹1,000"', () => {
    expect(normalizeAmount('₹1,000')).toBe(1000);
  });

  test('converts standard float string e.g. "1000.00"', () => {
    expect(normalizeAmount('1000.00')).toBe(1000);
  });

  test('converts amount with trailing currency code e.g. "1,000 INR"', () => {
    expect(normalizeAmount('1,000 INR')).toBe(1000);
  });

  test('converts amount with leading currency code e.g. "INR 1000"', () => {
    expect(normalizeAmount('INR 1000')).toBe(1000);
  });

  test('converts currency with spaces and decimals e.g. "₹ 1,250.50"', () => {
    expect(normalizeAmount('₹ 1,250.50')).toBe(1250.5);
  });

  test('converts Indian numbering format with multiple commas e.g. "10,50,000"', () => {
    expect(normalizeAmount('10,50,000')).toBe(1050000);
  });

  test('handles negative values with minus sign or parentheses', () => {
    expect(normalizeAmount('-₹500.00')).toBe(-500);
    expect(normalizeAmount('(1,000)')).toBe(-1000);
  });

  test('handles edge cases: null, undefined, empty string, and non-numeric', () => {
    expect(normalizeAmount(null)).toBe(0);
    expect(normalizeAmount(undefined)).toBe(0);
    expect(normalizeAmount('')).toBe(0);
    expect(normalizeAmount('   ')).toBe(0);
    expect(normalizeAmount('N/A')).toBe(0);
  });

  test('handles direct numeric input without alteration', () => {
    expect(normalizeAmount(4500)).toBe(4500);
    expect(normalizeAmount(0)).toBe(0);
  });
});

describe('Normalizer - normalizeDate', () => {
  test('converts short date format e.g. "04/09/26" to ISO "2026-09-04"', () => {
    expect(normalizeDate('04/09/26')).toBe('2026-09-04');
  });

  test('converts standard ISO date string e.g. "2026-09-04"', () => {
    expect(normalizeDate('2026-09-04')).toBe('2026-09-04');
  });

  test('converts verbal date strings e.g. "Sep 4, 2026"', () => {
    expect(normalizeDate('Sep 4, 2026')).toBe('2026-09-04');
    expect(normalizeDate('September 4, 2026')).toBe('2026-09-04');
  });

  test('converts dates containing timestamps e.g. "04/09/2026 14:30:00" and ISO timestamp', () => {
    expect(normalizeDate('04/09/2026 14:30:00')).toBe('2026-09-04');
    expect(normalizeDate('2026-09-04T10:15:30Z')).toBe('2026-09-04');
  });

  test('converts hyphenated DD-MM-YYYY format e.g. "04-09-2026"', () => {
    expect(normalizeDate('04-09-2026')).toBe('2026-09-04');
  });

  test('handles Date objects', () => {
    const d = new Date(2026, 8, 4); // month is 0-indexed (8 = September)
    expect(normalizeDate(d)).toBe('2026-09-04');
  });

  test('handles edge cases: null, undefined, empty, and invalid strings', () => {
    expect(normalizeDate(null)).toBeNull();
    expect(normalizeDate(undefined)).toBeNull();
    expect(normalizeDate('')).toBeNull();
    expect(normalizeDate('not-a-date')).toBeNull();
  });
});

describe('Normalizer - normalizeText', () => {
  test('trims and lowercases text', () => {
    expect(normalizeText('  TXN1001  ')).toBe('txn1001');
    expect(normalizeText(null)).toBe('');
  });
});
