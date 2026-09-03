import { parseCsv } from '../src/services/ingestionService.js';

describe('Ingestion Service - parseCsv', () => {
  test('parses CSV from string input into array of objects', () => {
    const csvContent = `transaction_id,amount,status\nTXN1001,"₹1,000",SUCCESS\nTXN1002,2500,SUCCESS`;
    const records = parseCsv(csvContent);

    expect(records).toHaveLength(2);
    expect(records[0]).toEqual({
      transaction_id: 'TXN1001',
      amount: '₹1,000',
      status: 'SUCCESS',
    });
    expect(records[1].transaction_id).toBe('TXN1002');
  });

  test('parses CSV from Buffer input', () => {
    const csvBuffer = Buffer.from(`bank_ref,credit_amount\nTXN1001,1000.00\nTXN1002,2500.00`);
    const records = parseCsv(csvBuffer);

    expect(records).toHaveLength(2);
    expect(records[0].bank_ref).toBe('TXN1001');
    expect(records[0].credit_amount).toBe('1000.00');
  });

  test('skips empty lines and trims whitespace from headers', () => {
    const csvWithEmptyLines = ` order_id , txn_ref , amount \n\nORD-1,TXN1001,1000\n\nORD-2,TXN1002,2000\n\n`;
    const records = parseCsv(csvWithEmptyLines);

    expect(records).toHaveLength(2);
    expect(records[0]).toHaveProperty('order_id', 'ORD-1');
    expect(records[0]).toHaveProperty('txn_ref', 'TXN1001');
  });

  test('throws TypeError on invalid input type', () => {
    expect(() => parseCsv(12345)).toThrow(TypeError);
    expect(() => parseCsv(null)).toThrow(TypeError);
  });
});
