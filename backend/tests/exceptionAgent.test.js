import { jest } from '@jest/globals';
import { explainSingleException } from '../src/agents/exceptionAgent.js';

describe('Exception Agent - explainSingleException', () => {
  test('parses and returns AI explanation and recommended action', async () => {
    const mockClient = jest.fn().mockResolvedValue(JSON.stringify({
      explanation: 'Amount mismatch detected between Order and Payment settlement. The customer was billed ₹500 less due to an unapplied discount coupon.',
      recommendedAction: 'Verify the promotional code with sales operations and update the customer ledger.',
    }));
    mockClient.isMock = true;

    const record = {
      txnRef: 'TXN1058',
      status: 'amount_mismatch',
      priority: 'high',
      paymentAmount: 4500,
      bankAmount: 4500,
      orderAmount: 5000,
    };

    const result = await explainSingleException(record, mockClient);

    expect(mockClient).toHaveBeenCalledTimes(1);
    expect(result.explanation).toContain('Amount mismatch detected');
    expect(result.recommendedAction).toContain('Verify the promotional code');
  });

  test('falls back safely to default message if LLM fails', async () => {
    const mockClient = jest.fn().mockRejectedValue(new Error('Rate limit exceeded (429)'));
    mockClient.isMock = true;

    const record = {
      txnRef: 'TXN1059',
      status: 'missing_settlement',
      priority: 'critical',
      paymentAmount: 50000,
      bankAmount: null,
      orderAmount: 50000,
    };

    const result = await explainSingleException(record, mockClient);

    expect(result.explanation).toBeNull();
    expect(result.recommendedAction).toBe('Manual review required');
  });
});
