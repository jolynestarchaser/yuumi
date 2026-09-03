import { Router } from 'express';
import mongoose from 'mongoose';
import DesktopText from '../models/DesktopText.js';

const router = Router();
const validColor = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const validPoint = (value, maximum) => Number.isFinite(value) && value >= 0 && value <= maximum;

router.get('/', async (_req, res) => {
  const texts = await DesktopText.find({ desktopKey: 'shared-desktop' }).sort({ createdAt: 1 }).limit(500);
  res.json({ success: true, data: texts });
});

router.post('/', async (req, res) => {
  const { text, x, y, color, size } = req.body;
  if (typeof text !== 'string' || !text.trim() || !validPoint(x, 1440) || !validPoint(y, 900) || !validColor(color) || !Number.isFinite(size) || size < 12 || size > 64) throw new Error('Invalid desktop text');
  const annotation = await DesktopText.create({ desktopKey: 'shared-desktop', text, x, y, color, size });
  res.status(201).json({ success: true, data: annotation });
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new Error('Invalid text ID');
  const annotation = await DesktopText.findByIdAndDelete(req.params.id);
  if (!annotation) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Text not found.' } });
  res.json({ success: true, data: { id: annotation.id } });
});

router.delete('/', async (_req, res) => {
  const result = await DesktopText.deleteMany({ desktopKey: 'shared-desktop' });
  res.json({ success: true, data: { deletedCount: result.deletedCount } });
});

export default router;
