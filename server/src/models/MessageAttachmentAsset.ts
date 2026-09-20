import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  owner: { type: String, enum: ['joe', 'focus'], required: true },
  operationId: { type: String, required: true, maxlength: 80 },
  fingerprint: { type: String, required: true, maxlength: 64 },
  status: { type: String, enum: ['pending', 'complete', 'failed'], required: true, default: 'pending' },
  // Optional for legacy assets. These server-owned identifiers are prerequisites
  // for future cleanup, not evidence that an asset is safe to delete.
  origin: { type: String, enum: ['upload', 'url-import'] },
  cloudinaryAssetId: { type: String },
  cloudinaryPublicId: { type: String },
  cloudinaryResourceType: { type: String, enum: ['image', 'video', 'raw'] },
  kind: { type: String, enum: ['image', 'audio'] },
  secureUrl: { type: String, match: /^https:\/\// },
  name: { type: String, maxlength: 180 },
  mimeType: { type: String },
  bytes: { type: Number, min: 0, max: 10 * 1024 * 1024 },
  duration: { type: Number, min: 0, default: null },
  errorCode: { type: String, maxlength: 40 },
}, { timestamps: true });

schema.index({ owner: 1, operationId: 1 }, { unique: true });

export default mongoose.model('MessageAttachmentAsset', schema);
