import { Router } from 'express';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Message, { messageAnimationTypes } from '../models/Message.js';
import { requireDesktopSession, requireProfile } from '../middleware/auth.js';

const router = Router();
router.use(requireDesktopSession, requireProfile);
const sendWindow = new Map();

function checkRate(profile) {
  const now = Date.now();
  const current = (sendWindow.get(profile) || []).filter((time) => now - time < 60_000);
  if (current.length >= 10) return false;
  current.push(now); sendWindow.set(profile, current); return true;
}

router.get('/', async (req, res) => {
  const folder = req.query.folder === 'sent' ? { sender: req.desktop.profile } : { recipient: req.desktop.profile };
  const rows = await Message.find(folder).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, data: rows });
});

router.get('/unread-count', async (req, res) => {
  const count = await Message.countDocuments({ recipient: req.desktop.profile, readAt: null });
  res.json({ success: true, data: { count } });
});

router.post('/', async (req, res) => {
  if (!checkRate(req.desktop.profile)) return res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Please wait before sending another message.' } });
  const recipient = String(req.body?.recipient || '').toLowerCase();
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
  const kind = ['alert', 'letter'].includes(req.body?.kind) ? req.body.kind : 'letter';
  const animation = messageAnimationTypes.includes(req.body?.animation) ? req.body.animation : 'hearts';
  const emoji = typeof req.body?.emoji === 'string' ? req.body.emoji.slice(0, 16) : '💌';
  if (!['joe', 'focus'].includes(recipient) || recipient === req.desktop.profile || !body || body.length > 5000 || subject.length > 120) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Message details are invalid.' } });
  const operationId = typeof req.body?.operationId === 'string' && req.body.operationId.length <= 80 ? req.body.operationId : crypto.randomUUID();
  const message = await Message.findOneAndUpdate({ operationId }, { sender: req.desktop.profile, recipient, kind, subject, body, emoji, animation, operationId }, { upsert: true, new: true, setDefaultsOnInsert: true });
  req.app.get('io')?.to(`profile:${recipient}`).emit('message:received', message);
  res.status(201).json({ success: true, data: message });
});

router.patch('/:id/read', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid message ID.' } });
  const message = await Message.findOneAndUpdate({ _id: req.params.id, recipient: req.desktop.profile }, { $set: { readAt: new Date() } }, { new: true });
  if (!message) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Message not found.' } });
  req.app.get('io')?.to(`profile:${req.desktop.profile}`).emit('message:read', message);
  res.json({ success: true, data: message });
});

export default router;
