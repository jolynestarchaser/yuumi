import { Router } from 'express';
import mongoose from 'mongoose';
import Item from '../models/Item.js';
import DesktopText from '../models/DesktopText.js';
import RevisionHistory from '../models/RevisionHistory.js';
import { requireDesktopSession, requireProfile } from '../middleware/auth.js';
import { revisionService, itemSnapshot, textSnapshot } from '../services/historyService.js';

const router = Router();
router.use(requireDesktopSession, requireProfile);

router.get('/', async (req, res) => {
  const { entityType, entityId, limit = 50, before } = req.query;
  if (!['item', 'desktop-text'].includes(entityType) || !mongoose.isValidObjectId(entityId)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A valid entity type and ID are required.' } });
  const query = { entityType, entityId };
  if (before && !Number.isNaN(Number(before))) query.revision = { $lt: Number(before) };
  const rows = await RevisionHistory.find(query).sort({ revision: -1 }).limit(Math.min(100, Math.max(1, Number(limit) || 50))).lean();
  res.json({ success: true, data: rows });
});

router.post('/:historyId/restore', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.historyId)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid history ID.' } });
  const history = await RevisionHistory.findById(req.params.historyId);
  if (!history) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'History version not found.' } });
  const expectedRevision = Number(req.body?.expectedRevision);
  if (history.entityType === 'item') {
    const item = await Item.findById(history.entityId);
    if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found.' } });
    if (Number.isFinite(expectedRevision) && expectedRevision !== (item.contentRevision || 0)) return res.status(409).json({ success: false, error: { code: 'REVISION_CONFLICT', message: 'This item changed elsewhere.', data: { current: item } } });
    const snapshot = history.snapshot || {};
    ['name', 'content', 'url', 'metadata', 'size', 'appearance', 'secret', 'secretLabel'].forEach((field) => { if (snapshot[field] !== undefined) item[field] = snapshot[field]; });
    item.contentRevision = (item.contentRevision || 0) + 1;
    await item.save();
    await revisionService.record({ entityType: 'item', entityId: item._id, revision: item.contentRevision, operation: 'restore', actor: req.desktop.profile, snapshot: itemSnapshot(item), restoredFromRevision: history.revision });
    return res.json({ success: true, data: item });
  }
  const text = await DesktopText.findById(history.entityId);
  if (!text) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Desktop text not found.' } });
  if (Number.isFinite(expectedRevision) && expectedRevision !== (text.revision || 0)) return res.status(409).json({ success: false, error: { code: 'REVISION_CONFLICT', message: 'This text changed elsewhere.', data: { current: text } } });
  Object.assign(text, history.snapshot || {});
  text.deletedAt = null;
  text.revision = (text.revision || 0) + 1;
  text.updatedBy = req.desktop.profile;
  await text.save();
  await revisionService.record({ entityType: 'desktop-text', entityId: text._id, revision: text.revision, operation: 'restore', actor: req.desktop.profile, snapshot: textSnapshot(text), restoredFromRevision: history.revision });
  return res.json({ success: true, data: text });
});

export default router;
