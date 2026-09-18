import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  _id: String,
  schemaVersion: { type: Number, default: 1, min: 1 },
  budget: {
    day: String,
    chats: { type: Number, default: 0, min: 0 },
    portraits: { type: Number, default: 0, min: 0 },
    lastChat: Date,
    lastPortrait: Date
  },
  recentOperations: { type: [String], default: [] },
  lockToken: String,
  lockedUntil: { type: Date, default: () => new Date(0) }
}, { minimize: false, timestamps: true });

export default mongoose.model('CompanionFamily', schema);
