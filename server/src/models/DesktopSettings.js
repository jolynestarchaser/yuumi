import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({ url: String, publicId: String }, { _id: false });

const desktopSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'shared-desktop', unique: true },
  wallpaper: {
    type: { type: String, enum: ['preset', 'image', 'solid', 'gradient'], default: 'preset' },
    value: { type: String, default: 'neon' },
    asset: assetSchema,
    colors: [{ type: String, maxlength: 16 }],
    angle: { type: Number, min: 0, max: 360, default: 135 },
    fit: { type: String, enum: ['cover', 'contain', 'tile'], default: 'cover' },
    position: {
      x: { type: Number, min: 0, max: 100, default: 50 },
      y: { type: Number, min: 0, max: 100, default: 50 }
    },
    backgroundColor: { type: String, default: '#06113e', maxlength: 16 },
    dimness: { type: Number, min: 0, max: 70, default: 18 },
    blur: { type: Number, min: 0, max: 24, default: 0 },
    brightness: { type: Number, min: 40, max: 140, default: 100 },
    saturation: { type: Number, min: 0, max: 180, default: 100 }
  },
  iconTheme: { type: String, enum: ['soft', 'glass', 'classic'], default: 'soft' },
  cursor: {
    enabled: { type: Boolean, default: true },
    style: { type: String, enum: ['orb', 'ring', 'star'], default: 'orb' },
    shape: { type: String, enum: ['dot', 'arrow', 'hand', 'crosshair', 'sparkle', 'image'], default: 'arrow' },
    asset: assetSchema,
    color: { type: String, default: '#b6ff00', maxlength: 16 }
  },
  snapToGrid: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('DesktopSettings', desktopSettingsSchema);
