import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ['joe', 'focus'], required: true, index: true },
  recipient: { type: String, enum: ['joe', 'focus'], required: true, index: true },
  kind: { type: String, enum: ['alert', 'letter'], default: 'letter' },
  subject: { type: String, trim: true, maxlength: 120, default: '' },
  body: { type: String, trim: true, maxlength: 5000, required: true },
  emoji: { type: String, maxlength: 16, default: '💌' },
  animation: { type: String, enum: ['none', 'hearts', 'sparkles', 'emoji-rain'], default: 'hearts' },
  readAt: { type: Date, default: null },
  operationId: { type: String, required: true, unique: true, index: true }
}, { timestamps: true });

messageSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
