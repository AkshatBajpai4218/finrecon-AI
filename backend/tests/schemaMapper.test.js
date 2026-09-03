import { jest } from '@jest/globals';
import { mapSchema, mapSchemaHardcoded } from '../src/core/schemaMapper.js';

describe('Schema Mapper - AI & Fallback Testing', () => {
  const samplePaymentRows = [
    {
      custom_transaction_ref: 'TXN-AI-101',
      settled_net_value: '₹12,500.00',
      authorized_timestamp: '2026-09-04 12:00:00',
      merchant_note: 'E-commerce purchase',
    },
  ];

  test('uses AI mapping when Claude returns valid JSON mapping', async () => {
    const mockLLM = jest.fn().mockResolvedValue(`\`\`\`json
{
  "txnRef": "custom_transaction_ref",
  "amount": "settled_net_value",
  "time": "authorized_timestamp",
  "description": "merchant_note"
}
\`\`\``);

    const result = await mapSchema(samplePaymentRows, 'payment', {
      useAI: true,
      llmClient: mockLLM,
    });

    expect(mockLLM).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      txnRef: 'TXN-AI-101',
      amount: 12500,
      time: '2026-09-04',
      description: 'E-commerce purchase',
    });
  });

  test('gracefully falls back to hardcoded mapping when LLM returns malformed JSON', async () => {
    const mockLLM = jest.fn().mockResolvedValue('Oops, I cannot format this as JSON properly { invalid json');

    const standardRows = [
      {
        transaction_id: 'TXN-FALLBACK-1',
        amount: '1,000.00',
        timestamp: '2026-09-04',
        status: 'CAPTURED',
      },
    ];

    const result = await mapSchema(standardRows, 'payment', {
      useAI: true,
      llmClient: mockLLM,
    });

    expect(mockLLM).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].txnRef).toBe('TXN-FALLBACK-1');
    expect(result[0].amount).toBe(1000);
    expect(result[0].description).toBe('CAPTURED');
  });

  test('gracefully falls back to hardcoded mapping when LLM returns missing fields', async () => {
    const mockLLM = jest.fn().mockResolvedValue(JSON.stringify({
      amount: 'settled_net_value', // missing txnRef!
    }));

    const standardRows = [
      {
        transaction_id: 'TXN-FALLBACK-2',
        amount: '2,500',
        timestamp: '2026-09-04',
        status: 'SUCCESS',
      },
    ];

    const result = await mapSchema(standardRows, 'payment', {
      useAI: true,
      llmClient: mockLLM,
    });

    expect(mockLLM).toHaveBeenCalledTimes(1);
    expect(result[0].txnRef).toBe('TXN-FALLBACK-2');
    expect(result[0].amount).toBe(2500);
  });

  test('deterministic hardcoded mapping works directly for all sources', () => {
    const payment = mapSchemaHardcoded([{ transaction_id: 'T1', amount: '₹500', timestamp: '04/09/26', status: 'OK' }], 'payment');
    expect(payment[0].txnRef).toBe('T1');
    expect(payment[0].amount).toBe(500);

    const bank = mapSchemaHardcoded([{ reference: 'B1', credit: '500.00', date: '2026-09-04', description: 'NEFT' }], 'bank');
    expect(bank[0].txnRef).toBe('B1');
    expect(bank[0].amount).toBe(500);

    const order = mapSchemaHardcoded([{ order_id: 'O1', order_amount: '500', customer: 'User' }], 'order');
    expect(order[0].txnRef).toBe('O1');
    expect(order[0].amount).toBe(500);
  });
});
