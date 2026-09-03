import mongoose from 'mongoose';

export async function connectDb() {
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI is not set; API routes requiring data will be unavailable.');
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.info('Connected to MongoDB');
}

