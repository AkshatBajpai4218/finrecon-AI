import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB } from '../src/db/connection.js';
import { UploadBatch } from '../src/models/uploadBatch.model.js';
import { Transaction } from '../src/models/transaction.model.js';

describe('Integration Flow: Upload -> Reconcile -> Exceptions', () => {
  let batchId = null;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    if (batchId) {
      await Transaction.deleteMany({ batchId });
      await UploadBatch.findByIdAndDelete(batchId);
    }
    await mongoose.connection.close();
  });

  test('POST /api/upload accepts 3 files and creates an UploadBatch', async () => {
    const paymentCsv = `transaction_id,amount,timestamp,status
TXN-INT-1,1000,2026-09-04 10:00:00,SUCCESS
TXN-INT-2,2000,2026-09-04 10:00:00,SUCCESS`;

    const bankCsv = `reference,credit,date,description
TXN-INT-1,1000,2026-09-04 10:45:00,SETTLEMENT
TXN-INT-2,2000,2026-09-04 10:45:00,SETTLEMENT`;

    const ordersCsv = `order_id,order_amount,order_date,customer
TXN-INT-1,1000,2026-09-04 09:50:00,Customer One
TXN-INT-2,2500,2026-09-04 09:50:00,Customer Two`;

    const res = await request(app)
      .post('/api/upload')
      .attach('payment', Buffer.from(paymentCsv), 'payment.csv')
      .attach('bank', Buffer.from(bankCsv), 'bank.csv')
      .attach('orders', Buffer.from(ordersCsv), 'orders.csv');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('batchId');
    expect(res.body.status).toBe('processing');

    batchId = res.body.batchId;
    expect(mongoose.Types.ObjectId.isValid(batchId)).toBe(true);
  });

  test('POST /api/reconcile/:batchId runs pipeline and returns counts', async () => {
    const res = await request(app).post(`/api/reconcile/${batchId}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'completed');
    expect(res.body).toHaveProperty('matched', 1);
    expect(res.body).toHaveProperty('exceptions', 1);
  }, 30000);

  test('GET /api/reconcile/:batchId/status returns batch status for polling', async () => {
    const res = await request(app).get(`/api/reconcile/${batchId}/status`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('progress');
  });

  test('GET /api/exceptions/:batchId returns exceptions sorted by priority', async () => {
    const res = await request(app).get(`/api/exceptions/${batchId}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('exceptions');
    expect(res.body.exceptions).toHaveLength(1);

    const ex = res.body.exceptions[0];
    expect(ex.txnRef).toBe('TXN-INT-2');
    expect(ex.status).toBe('amount_mismatch');
    expect(ex.priority).toBeDefined();
    expect(ex.confidence).toBeDefined();
  });
});
