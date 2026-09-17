import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  publicId: String, url: String, secureUrl: String, thumbnailUrl: String, originalName: String, extension: String, resourceType: String, mimeType: String,
  bytes: Number, width: Number, height: Number, duration: Number
}, { _id: false });

const metadataSchema = new mongoose.Schema({
  title: String, description: String, siteName: String, favicon: String, previewImage: String, provider: String, providerId: String, mediaType: String, embedUrl: String
}, { _id: false });

const appearanceSchema = new mongoose.Schema({
  iconType: { type: String, enum: ['default', 'lucide', 'emoji', 'image'], default: 'default' },
  iconValue: { type: String, maxlength: 1000 },
  iconColor: { type: String, maxlength: 32 },
  iconBackground: { type: String, maxlength: 32 },
  sprite: {
    enabled: { type: Boolean, default: false },
    frames: { type: Number, min: 1, max: 120, default: 1 },
    fps: { type: Number, min: 1, max: 60, default: 8 }
  }
}, { _id: false });

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    type: { type: String, required: true, enum: ['folder', 'image', 'video', 'audio', 'link', 'note', 'file', 'calendar', 'map'] },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    position: { x: { type: Number, default: 0, min: 0 }, y: { type: Number, default: 0, min: 0 }, revision: { type: Number, default: 0, min: 0 } },
    deletedAt: { type: Date, default: null },
    deletedFrom: {
      parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
      position: { x: Number, y: Number }
    },
    size: { width: Number, height: Number },
    content: { type: String, maxlength: 10000, required: [function requiresContent() { return this.type === 'note'; }, 'A note requires content'] },
    url: { type: String, required: [function requiresUrl() { return this.type === 'link'; }, 'A link requires a URL'] },
    asset: { type: assetSchema, required: [function requiresAsset() { return ['image', 'video', 'audio', 'file'].includes(this.type); }, 'Media requires an asset URL'], validate: { validator(asset) { return !['image', 'video', 'audio', 'file'].includes(this.type) || Boolean(asset?.secureUrl); }, message: 'Media requires an asset URL' } }, metadata: metadataSchema, appearance: appearanceSchema,
    secret: { type: Boolean, default: false, index: true },
    secretLabel: { type: String, trim: true, maxlength: 80 },
    contentRevision: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: String, enum: ['joe', 'focus', 'system', 'unknown'], default: 'unknown' }
  },
  { timestamps: true }
);
itemSchema.index({ parentId: 1 });
itemSchema.index({ parentId: 1, type: 1 });
itemSchema.index({ deletedAt: 1 });
itemSchema.index({ createdBy: 1 });

itemSchema.pre('validate', function validateItem(next) {
  if (!Number.isFinite(this.position?.x) || !Number.isFinite(this.position?.y)) return next(new Error('Position must be finite numbers'));
  if (this.parentId && this._id && this.parentId.equals(this._id)) return next(new Error('An item cannot contain itself'));
  if (this.type === 'note' && !this.content) return next(new Error('A note requires content'));
  if (this.type === 'link' && !this.url) return next(new Error('A link requires a URL'));
  if (['image', 'video', 'audio', 'file'].includes(this.type) && !this.asset?.secureUrl) return next(new Error('Media requires an asset URL'));
  next();
});

export default mongoose.model('Item', itemSchema);
