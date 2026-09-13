import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import DesktopSession from '../models/DesktopSession.js';
import { desktopJwtSecret, requireAuth, requireDesktopSession, readBearer } from '../middleware/auth.js';
import crypto from 'node:crypto';

const router = Router();
const publicUser = (user) => ({ id: user.id, username: user.username, displayName: user.displayName });
const unlockAttempts = new Map();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username: username?.toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Username or password is incorrect.' } });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, desktopJwtSecret(), { expiresIn: '7d' });
  res.json({ success: true, data: { token, user: publicUser(user) } });
});

router.post('/unlock', async (req, res) => {
  const now = Date.now(); const key = req.ip || 'unknown'; const recent = (unlockAttempts.get(key) || []).filter((time) => now - time < 15 * 60 * 1000);
  if (recent.length >= 10) return res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' } });
  recent.push(now); unlockAttempts.set(key, recent);
  const pin = typeof req.body?.pin === 'string' ? req.body.pin : '';
  const expected = process.env.DESKTOP_PIN || '3112';
  const pinBytes = Buffer.from(pin); const expectedBytes = Buffer.from(expected);
  if (pinBytes.length !== expectedBytes.length || !crypto.timingSafeEqual(pinBytes, expectedBytes)) {
    return res.status(401).json({ success: false, error: { code: 'INVALID_PIN', message: 'PIN is incorrect.' } });
  }
  const tokenId = crypto.randomUUID();
  unlockAttempts.delete(key);
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
  await DesktopSession.create({ tokenId, expiresAt });
  const token = jwt.sign({ type: 'desktop', jti: tokenId }, desktopJwtSecret(), { expiresIn: '12h' });
  return res.json({ success: true, data: { token, expiresAt } });
});

router.post('/profile', requireDesktopSession, async (req, res) => {
  const profile = String(req.body?.profile || '').toLowerCase();
  if (!['joe', 'focus'].includes(profile)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Profile must be Joe or Focus.' } });
  const tokenId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
  await DesktopSession.create({ tokenId, profile, expiresAt });
  const token = jwt.sign({ type: 'desktop', jti: tokenId, profile }, desktopJwtSecret(), { expiresIn: '12h' });
  const oldToken = readBearer(req);
  await DesktopSession.updateOne({ tokenId: req.desktop.tokenId }, { revokedAt: new Date() });
  return res.json({ success: true, data: { token, profile, expiresAt, previousTokenRevoked: Boolean(oldToken) } });
});

router.get('/session', requireDesktopSession, (_req, res) => res.json({ success: true, data: { profile: _req.desktop.profile } }));

router.post('/logout', requireDesktopSession, async (req, res) => {
  await DesktopSession.updateOne({ tokenId: req.desktop.tokenId }, { revokedAt: new Date() });
  return res.json({ success: true, data: { loggedOut: true } });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User no longer exists.' } });
  res.json({ success: true, data: publicUser(user) });
});
export default router;
