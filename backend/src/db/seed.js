import mongoose from 'mongoose';
import connectDB from './connection.js';
import UploadBatch from '../models/uploadBatch.model.js';
import Transaction from '../models/transaction.model.js';
import AuditLog from '../models/auditLog.model.js';

export async function seedDatabase() {
  console.log('🌱 Starting MongoDB seed for FinRecon AI...');

  try {
    const conn = await connectDB();
    if (!conn) {
      throw new Error('Could not establish MongoDB connection. Please check MONGODB_URI.');
    }

    // 1. Create sample UploadBatch
    const batch = await UploadBatch.create({
      paymentFile: 'razorpay_settlements_20260901.csv',
      bankFile: 'hdfc_statement_20260901.csv',
      orderFile: 'shopify_orders_20260901.csv',
      status: 'completed',
    });

    console.log(`✓ Created upload batch: ${batch._id}`);

    // 2. 5 sample transactions covering different reconciliation statuses
    const sampleTransactions = [
      {
        batchId: batch._id,
        txnRef: 'TXN-20260901-001',
        paymentAmount: 1500.0,
        bankAmount: 1500.0,
        orderAmount: 1500.0,
        paymentTime: new Date('2026-09-01T10:30:00Z'),
        bankTime: new Date('2026-09-02T04:15:00Z'),
        orderTime: new Date('2026-09-01T10:28:00Z'),
        status: 'matched',
        confidence: 1.0,
        priority: 'low',
        explanation: 'Exact 3-way match across payment gateway, bank settlement, and order records.',
        recommendedAction: 'Auto-reconcile and close.',
      },
      {
        batchId: batch._id,
        txnRef: 'TXN-20260901-002',
        paymentAmount: 2400.0,
        bankAmount: 2350.0,
        orderAmount: 2400.0,
        paymentTime: new Date('2026-09-01T11:45:00Z'),
        bankTime: new Date('2026-09-02T05:20:00Z'),
        orderTime: new Date('2026-09-01T11:40:00Z'),
        status: 'mismatch',
        confidence: 0.65,
        priority: 'high',
        explanation: '$50.00 delta detected between gateway authorization and bank payout. Potential fee schedule discrepancy.',
        recommendedAction: 'Verify MDR/gateway processing fee breakdown against merchant contract.',
      },
      {
        batchId: batch._id,
        txnRef: 'TXN-20260901-003',
        paymentAmount: 9800.0,
        bankAmount: null,
        orderAmount: 9800.0,
        paymentTime: new Date('2026-09-01T14:10:00Z'),
        bankTime: null,
        orderTime: new Date('2026-09-01T14:05:00Z'),
        status: 'missing_settlement',
        confidence: 0.3,
        priority: 'critical',
        explanation: 'Customer paid and order dispatched, but settlement has not appeared in bank account after T+3 banking days.',
        recommendedAction: 'Escalate to payment gateway ops with ARN reference for urgent settlement trace.',
      },
      {
        batchId: batch._id,
        txnRef: 'TXN-20260901-004',
        paymentAmount: 450.0,
        bankAmount: 450.0,
        orderAmount: 450.0,
        paymentTime: new Date('2026-08-30T18:30:00Z'),
        bankTime: new Date('2026-09-03T09:10:00Z'),
        orderTime: new Date('2026-08-30T18:25:00Z'),
        status: 'delay',
        confidence: 0.85,
        priority: 'medium',
        explanation: 'Settlement cleared 4 business days after transaction due to weekend banking clearing window.',
        recommendedAction: 'Clear exception and adjust settlement cutoff policy.',
      },
      {
        batchId: batch._id,
        txnRef: 'TXN-20260901-005',
        paymentAmount: 1200.0,
        bankAmount: 2400.0,
        orderAmount: 1200.0,
        paymentTime: new Date('2026-09-01T16:00:00Z'),
        bankTime: new Date('2026-09-02T07:45:00Z'),
        orderTime: new Date('2026-09-01T15:55:00Z'),
        status: 'duplicate',
        confidence: 0.45,
        priority: 'critical',
        explanation: 'Duplicate credit detected. Bank statement reflects payout twice for single order.',
        recommendedAction: 'Place immediate hold on duplicate credit and issue bank clawback notice.',
      },
    ];

    const insertedTransactions = await Transaction.insertMany(sampleTransactions);
    console.log(`✓ Inserted ${insertedTransactions.length} sample transactions.`);

    // 3. Create initial AuditLog
    const auditLog = await AuditLog.create({
      batchId: batch._id,
      action: 'BATCH_RECONCILIATION_RUN',
      performedBy: 'system_reconciliation_agent',
      details: {
        totalTransactions: sampleTransactions.length,
        matchedCount: 1,
        exceptionsCount: 4,
        ruleSetVersion: 'v2.4',
      },
    });

    console.log(`✓ Created audit log: ${auditLog._id}`);
    console.log('🎉 MongoDB seeding completed successfully.');

    return {
      seeded: true,
      batchId: batch._id,
      transactionCount: insertedTransactions.length,
      auditLogId: auditLog._id,
    };
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Auto-run when executed directly via `node src/db/seed.js`
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedDatabase;
