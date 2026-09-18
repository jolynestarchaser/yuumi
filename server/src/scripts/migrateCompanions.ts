import 'dotenv/config';
import mongoose from 'mongoose';
import { ensureCompanionFamily, migrateCompanionRoster } from '../services/companionMigration.js';

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required for the companion migration.');
await mongoose.connect(process.env.MONGODB_URI);
try {
  const result = await migrateCompanionRoster();
  await ensureCompanionFamily();
  console.log(`Companion migration complete: ${result.changed}/${result.scanned} records updated.`);
} finally {
  await mongoose.disconnect();
}
