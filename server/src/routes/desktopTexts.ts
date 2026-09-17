import { Router } from 'express';
import mongoose from 'mongoose';
import DesktopText from '../models/DesktopText.js';
import { requireDesktopSession, requireProfile } from '../middleware/auth.js';
import { revisionService, textSnapshot } from '../services/historyService.js';

const router = Router();
router.use(requireDesktopSession, requireProfile);
const validColor = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const validPoint = (value, maximum) => Number.isFinite(value) && value >= 0 && value <= maximum;

router.get('/', async (_req, res) => {
  const texts = await DesktopText.find({ desktopKey: 'shared-desktop', deletedAt: null }).sort({ createdAt: 1 }).limit(500);
  res.json({ success: true, data: texts });
});

router.post('/', async (req, res) => {
  const { text, x, y, color, size } = req.body;
  if (typeof text !== 'string' || !text.trim() || !validPoint(x, 1440) || !validPoint(y, 900) || !validColor(color) || !Number.isFinite(size) || size < 12 || size > 64) throw new Error('Invalid desktop text');
  const annotation = await DesktopText.create({ desktopKey: 'shared-desktop', text: text.trim(), x, y, color, size, createdBy: req.desktop.profile, updatedBy: req.desktop.profile });
  await revisionService.record({ entityType: 'desktop-text', entityId: annotation._id, revision: 0, operation: 'create', actor: req.desktop.profile, snapshot: textSnapshot(annotation) });
  res.status(201).json({ success: true, data: annotation });
});

router.patch('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new Error('Invalid text ID');
  const annotation = await DesktopText.findOne({ _id: req.params.id, desktopKey: 'shared-desktop', deletedAt: null });
  if (!annotation) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Text not found.' } });
  const expectedRevision = Number(req.body?.expectedRevision);
  if (Number.isFinite(expectedRevision) && expectedRevision !== (annotation.revision || 0)) return res.status(409).json({ success: false, error: { code: 'REVISION_CONFLICT', message: 'This text changed elsewhere.', data: { current: annotation } } });
  const { text, x, y, color, size } = req.body;
  if (typeof text !== 'string' || !text.trim() || !validPoint(x, 1440) || !validPoint(y, 900) || !validColor(color) || !Number.isFinite(size) || size < 12 || size > 64) throw new Error('Invalid desktop text');
  Object.assign(annotation, { text: text.trim(), x, y, color, size, updatedBy: req.desktop.profile, revision: (annotation.revision || 0) + 1 });
  await annotation.save();
  await revisionService.record({ entityType: 'desktop-text', entityId: annotation._id, revision: annotation.revision, operation: 'update', actor: req.desktop.profile, snapshot: textSnapshot(annotation) });
  res.json({ success: true, data: annotation });
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new Error('Invalid text ID');
  const annotation = await DesktopText.findById(req.params.id);
  if (!annotation) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Text not found.' } });
  await revisionService.record({ entityType: 'desktop-text', entityId: annotation._id, revision: (annotation.revision || 0) + 1, operation: 'delete', actor: req.desktop.profile, snapshot: textSnapshot(annotation) });
  await DesktopText.updateOne({ _id: annotation._id }, { deletedAt: new Date(), revision: (annotation.revision || 0) + 1 });
  res.json({ success: true, data: { id: annotation.id } });
});

router.delete('/', async (_req, res) => {
  const result = await DesktopText.updateMany({ desktopKey: 'shared-desktop', deletedAt: null }, { deletedAt: new Date() });
  res.json({ success: true, data: { deletedCount: result.modifiedCount } });
});

export default router;
