import mongoose from 'mongoose';

const boundsSchema = new mongoose.Schema({ x: Number, y: Number, width: Number, height: Number }, { _id: false });

const desktopWindowSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, unique: true },
  kind: { type: String, required: true, enum: ['folder', 'image', 'video', 'audio', 'link', 'note', 'file', 'calendar', 'map'] },
  bounds: { type: boundsSchema, required: true, default: () => ({ x: 120, y: 90, width: 620, height: 440 }) },
  restoreBounds: boundsSchema,
  minimized: { type: Boolean, default: false },
  maximized: { type: Boolean, default: false },
  z: { type: Number, default: 1 },
  revision: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('DesktopWindow', desktopWindowSchema);
