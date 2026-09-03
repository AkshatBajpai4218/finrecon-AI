import mongoose from 'mongoose';

const uploadBatchSchema = new mongoose.Schema(
  {
    paymentFile: { type: String, required: true },
    bankFile: { type: String, required: true },
    orderFile: { type: String, required: true },
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed', 'needs_manual_review'],
      default: 'processing',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

uploadBatchSchema.virtual('transactions', {
  ref: 'Transaction',
  localField: '_id',
  foreignField: 'batchId',
});

export const UploadBatch = mongoose.models.UploadBatch || mongoose.model('UploadBatch', uploadBatchSchema);
export default UploadBatch;
