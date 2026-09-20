import 'dotenv/config';
import mongoose from 'mongoose';
import { ensureCompanionFamily, migrateCompanionRoster } from '../services/companionMigration.js';

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required for the companion migration.');
await mongoose.connect(process.env.MONGODB_URI);
try {
  const dryRun = process.argv.includes('--dry-run');
  const result = await migrateCompanionRoster({ dryRun });
  if (!dryRun) await ensureCompanionFamily();
  console.log(`Companion migration ${dryRun ? 'dry run' : 'complete'}: ${result.changed}/${result.scanned} records ${dryRun ? 'would be updated' : 'updated'}.`);
} finally {
  await mongoose.disconnect();
}
