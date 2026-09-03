import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);

