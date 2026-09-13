import mongoose from 'mongoose';

const auditEventSchema = new mongoose.Schema({
  actor: { type: String, enum: ['joe', 'focus', 'system', 'unknown'], default: 'unknown' },
  action: { type: String, required: true, maxlength: 80 },
  entityType: { type: String, maxlength: 80 },
  entityId: { type: String, maxlength: 80 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

auditEventSchema.index({ createdAt: -1 });

export default mongoose.model('AuditEvent', auditEventSchema);
