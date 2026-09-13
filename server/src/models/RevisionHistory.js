import mongoose from 'mongoose';

const revisionHistorySchema = new mongoose.Schema({
  entityType: { type: String, enum: ['item', 'desktop-text'], required: true, index: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  revision: { type: Number, required: true, min: 0 },
  operation: { type: String, enum: ['create', 'update', 'restore', 'delete'], required: true },
  actor: { type: String, enum: ['joe', 'focus', 'system', 'unknown'], default: 'unknown' },
  snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  restoredFromRevision: { type: Number, default: null }
}, { timestamps: true });

revisionHistorySchema.index({ entityType: 1, entityId: 1, revision: -1 });

export default mongoose.model('RevisionHistory', revisionHistorySchema);
