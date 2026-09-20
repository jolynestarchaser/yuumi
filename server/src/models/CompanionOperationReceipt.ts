import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  familyId: { type: String, required: true, index: true },
  companionId: { type: String, required: true },
  operationId: { type: String, required: true },
  actor: { type: String, enum: ['joe', 'focus', 'system'], required: true },
  payloadHash: { type: String, required: true, minlength: 64, maxlength: 64 },
  outcomeCompanionId: { type: String, required: true },
  outcomeRevision: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: Date.now, index: true },
}, { versionKey: false });

schema.index({ familyId: 1, companionId: 1, operationId: 1 }, { unique: true });

export default mongoose.model('CompanionOperationReceipt', schema);
