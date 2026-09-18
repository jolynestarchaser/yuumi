import mongoose from 'mongoose';

const itemOperationSchema = new mongoose.Schema({
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  actor: { type: String, enum: ['joe', 'focus', 'system', 'unknown'], required: true },
  operationId: { type: String, required: true, maxlength: 80 },
  operation: { type: String, enum: ['update', 'restore'], required: true },
  revision: { type: Number, required: true, min: 0 },
  response: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

itemOperationSchema.index({ entityId: 1, actor: 1, operationId: 1 }, { unique: true });

export default mongoose.model('ItemOperation', itemOperationSchema);
