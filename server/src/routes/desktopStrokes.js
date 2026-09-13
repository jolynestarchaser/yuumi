import { Router } from 'express';
import mongoose from 'mongoose';
import DesktopStroke from '../models/DesktopStroke.js';

const router = Router();
const validColor = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const legacyCanvas = { width: 1440, height: 900 };
const validCanvas = (canvas) => canvas && Number.isFinite(canvas.width) && Number.isFinite(canvas.height)
  && canvas.width >= 240 && canvas.width <= 4096 && canvas.height >= 160 && canvas.height <= 4096;
const validPoints = (points, canvas) => Array.isArray(points) && points.length >= 2 && points.length <= 4000
  && points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= canvas.width && point.y >= 0 && point.y <= canvas.height);

router.get('/', async (_req, res) => {
  const strokes = await DesktopStroke.find({ desktopKey: 'shared-desktop' }).sort({ createdAt: 1 }).limit(2000);
  res.json({ success: true, data: strokes });
});

router.post('/', async (req, res) => {
  const { points, color, width, opacity = 1, canvas = legacyCanvas } = req.body;
  if (!validCanvas(canvas) || !validPoints(points, canvas) || !validColor(color) || !Number.isFinite(width)) throw new Error('Invalid stroke');
  const stroke = await DesktopStroke.create({ desktopKey: 'shared-desktop', points, color, width, opacity, canvas });
  res.status(201).json({ success: true, data: stroke });
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new Error('Invalid stroke ID');
  const stroke = await DesktopStroke.findByIdAndDelete(req.params.id);
  if (!stroke) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Stroke not found.' } });
  res.json({ success: true, data: { id: stroke.id } });
});

router.delete('/', async (_req, res) => {
  const result = await DesktopStroke.deleteMany({ desktopKey: 'shared-desktop' });
  res.json({ success: true, data: { deletedCount: result.deletedCount } });
});

export default router;
