import mongoose from 'mongoose';

export const messageAnimationTypes = Object.freeze([
  'none',
  'hearts',
  'sparkles',
  'emoji-rain',
  'confetti',
  'bubbles',
  'stars'
]);

export const messageIconTypes = Object.freeze([
  'heart', 'star', 'sparkles', 'bell', 'gift', 'music', 'cloud',
  'coffee', 'sun', 'rocket', 'game', 'idea', 'message', 'palette'
]);

const attachmentSchema = new mongoose.Schema({
  kind: { type: String, enum: ['image', 'audio', 'spotify'], required: true },
  secureUrl: { type: String, required() { return this.kind !== 'spotify'; }, match: /^https:\/\// },
  name: { type: String, trim: true, maxlength: 180, required: true },
  mimeType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/x-m4a'], required() { return this.kind !== 'spotify'; } },
  bytes: { type: Number, min: 0, max: 10 * 1024 * 1024 },
  duration: { type: Number, min: 0, default: null },
  spotifyUrl: { type: String, required() { return this.kind === 'spotify'; }, match: /^https:\/\/open\.spotify\.com\// },
  embedUrl: { type: String, required() { return this.kind === 'spotify'; }, match: /^https:\/\/open\.spotify\.com\/embed\// }
}, { _id: false });

const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ['joe', 'focus'], required: true, index: true },
  recipient: { type: String, enum: ['joe', 'focus'], required: true, index: true },
  kind: { type: String, enum: ['alert', 'letter'], default: 'letter' },
  subject: { type: String, trim: true, maxlength: 120, default: '' },
  body: { type: String, trim: true, maxlength: 5000, default: '' },
  attachment: { type: attachmentSchema, default: null },
  icon: { type: String, enum: messageIconTypes, default: 'heart' },
  accentColor: { type: String, match: /^#[0-9a-fA-F]{6}$/, default: '#ff8fa5' },
  emoji: { type: String, maxlength: 16, default: '💌' },
  animation: { type: String, enum: messageAnimationTypes, default: 'hearts' },
  readAt: { type: Date, default: null },
  operationId: { type: String, required: true, unique: true, index: true }
}, { timestamps: true });

messageSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
