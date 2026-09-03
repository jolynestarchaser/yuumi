import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({
  x: { type: Number, required: true, min: 0, max: 1440 },
  y: { type: Number, required: true, min: 0, max: 900 }
}, { _id: false });

const desktopStrokeSchema = new mongoose.Schema({
  desktopKey: { type: String, default: 'shared-desktop', index: true },
  points: {
    type: [pointSchema],
    required: true,
    validate: {
      validator: (points) => points.length >= 2 && points.length <= 4000,
      message: 'A stroke requires between 2 and 4000 points'
    }
  },
  color: { type: String, required: true, match: /^#[0-9a-f]{6}$/i },
  width: { type: Number, required: true, min: 1, max: 32 },
  opacity: { type: Number, min: 0.1, max: 1, default: 1 },
  createdBy: { type: String, maxlength: 120 }
}, { timestamps: true });

desktopStrokeSchema.index({ desktopKey: 1, createdAt: 1 });

export default mongoose.model('DesktopStroke', desktopStrokeSchema);
