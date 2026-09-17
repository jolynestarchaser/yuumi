import { Router } from 'express';
import mongoose from 'mongoose';
import DesktopWindow from '../models/DesktopWindow.js';

const router = Router();
const validBounds = (bounds) => bounds && ['x', 'y', 'width', 'height'].every((key) => Number.isFinite(bounds[key])) && bounds.width >= 240 && bounds.height >= 160;

router.get('/', async (_req, res) => res.json({ success: true, data: await DesktopWindow.find().sort({ z: 1 }) }));
router.put('/', async (req, res) => {
  if (!Array.isArray(req.body.windows) || req.body.windows.some((window) => !mongoose.isValidObjectId(window.itemId) || !validBounds(window.bounds))) throw new Error('Invalid window layout');
  await DesktopWindow.deleteMany({});
  const windows = await DesktopWindow.insertMany(req.body.windows.map((window, index) => ({ ...window, z: Number.isFinite(window.z) ? window.z : index + 1 })));
  res.json({ success: true, data: windows });
});
export default router;
