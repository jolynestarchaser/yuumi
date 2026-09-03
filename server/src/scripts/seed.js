import 'dotenv/config';
import bcrypt from 'bcrypt';
import { connectDb } from '../config/db.js';
import User from '../models/User.js';

const [username, password, displayName = username] = process.argv.slice(2);
if (!username || !password) throw new Error('Usage: node src/scripts/seed.js <username> <password> [displayName]');
await connectDb();
await User.findOneAndUpdate({ username: username.toLowerCase() }, { username: username.toLowerCase(), displayName, passwordHash: await bcrypt.hash(password, 12) }, { upsert: true, new: true, setDefaultsOnInsert: true });
console.info(`Seeded ${username}`);
process.exit(0);

