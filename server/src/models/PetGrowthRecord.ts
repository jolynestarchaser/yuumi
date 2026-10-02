import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  familyId: { type: String, required: true }, companionId: { type: String, required: true },
  eventId: { type: String, required: true }, presentationSequence: { type: Number, required: true, min: 1 },
  eventHash: { type: String, required: true },
  event: { type: mongoose.Schema.Types.Mixed, required: true },
  audit: { type: [mongoose.Schema.Types.Mixed], default: [] },
  acknowledgedAt: { type: Date, default: null },
}, { versionKey: false });
schema.index({ companionId: 1, eventId: 1 }, { unique: true });
schema.index({ companionId: 1, presentationSequence: 1 }, { unique: true });
schema.index({ familyId: 1, companionId: 1, acknowledgedAt: 1, presentationSequence: 1 });
// Permanent outcomes have no TTL, including unacknowledged reveals.
export default mongoose.model('PetGrowthRecord', schema);
