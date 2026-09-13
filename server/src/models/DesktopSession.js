import mongoose from 'mongoose';

const desktopSessionSchema = new mongoose.Schema({
  tokenId: { type: String, required: true, unique: true, index: true },
  profile: { type: String, enum: ['joe', 'focus'], default: null },
  unlockedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('DesktopSession', desktopSessionSchema);
