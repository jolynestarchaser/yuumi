import mongoose from 'mongoose';

const desktopTextSchema = new mongoose.Schema({
  desktopKey: { type: String, default: 'shared-desktop', index: true },
  text: { type: String, required: true, trim: true, minlength: 1, maxlength: 1000 },
  x: { type: Number, required: true, min: 0, max: 1440 },
  y: { type: Number, required: true, min: 0, max: 900 },
  color: { type: String, required: true, match: /^#[0-9a-f]{6}$/i },
  size: { type: Number, required: true, min: 12, max: 64 },
  createdBy: { type: String, maxlength: 120 },
  updatedBy: { type: String, maxlength: 120 },
  revision: { type: Number, default: 0, min: 0 },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

desktopTextSchema.index({ desktopKey: 1, createdAt: 1 });

export default mongoose.model('DesktopText', desktopTextSchema);
