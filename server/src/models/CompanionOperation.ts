import mongoose from 'mongoose';

const companionOperationSchema = new mongoose.Schema({
  familyId: { type: String, required: true, index: true },
  companionId: { type: String, required: true, index: true },
  operationId: { type: String, required: true, maxlength: 80 },
  actor: { type: String, enum: ['joe', 'focus', 'system', 'unknown'], required: true },
  action: { type: String, required: true, maxlength: 40 },
  payloadHash: { type: String, required: true, maxlength: 64 },
  revision: { type: Number, required: true, min: 0 },
  response: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });

companionOperationSchema.index({ familyId: 1, companionId: 1, operationId: 1 }, { unique: true });

export default mongoose.model('CompanionOperation', companionOperationSchema);
