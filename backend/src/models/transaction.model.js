import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UploadBatch',
      required: true,
      index: true,
    },
    txnRef: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    paymentAmount: { type: Number, default: null },
    bankAmount: { type: Number, default: null },
    orderAmount: { type: Number, default: null },
    paymentTime: { type: Date, default: null },
    bankTime: { type: Date, default: null },
    orderTime: { type: Date, default: null },
    status: {
      type: String,
      enum: ['matched', 'likely_match', 'mismatch', 'amount_mismatch', 'missing_settlement', 'unknown_credit', 'delay', 'settlement_delay', 'duplicate'],
      required: true,
      index: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'low',
      index: true,
    },
    explanation: { type: String, default: null },
    recommendedAction: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  }
);

export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
export default Transaction;
