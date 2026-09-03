import { Router } from 'express';
import mongoose from 'mongoose';
import Item from '../models/Item.js';
import DesktopWindow from '../models/DesktopWindow.js';

const router = Router();
const validId = (id) => mongoose.isValidObjectId(id);
const send = (res, data, status = 200) => res.status(status).json({ success: true, data });
const itemFields = ['name', 'content', 'url', 'metadata', 'size', 'appearance'];

async function ensureFolder(parentId) {
  if (parentId == null) return null;
  if (!validId(parentId)) throw new Error('Invalid parent folder ID');
  const parent = await Item.findById(parentId);
  if (!parent || parent.deletedAt || parent.type !== 'folder') throw new Error('Destination must be an existing folder');
  return parent;
}

async function wouldCreateCycle(item, parentId) {
  let cursor = parentId;
  while (cursor) {
    if (String(cursor) === String(item._id)) return true;
    const parent = await Item.findById(cursor).select('parentId');
    cursor = parent?.parentId;
  }
  return false;
}

router.get('/', async (req, res) => {
  if (req.query.scope === 'trash') return send(res, await Item.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 }));
  const parentId = req.query.parentId === 'root' || req.query.parentId === undefined ? null : req.query.parentId;
  if (parentId && !validId(parentId)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid parent ID.' } });
  send(res, await Item.find({ parentId, deletedAt: null }).sort({ updatedAt: -1 }));
});

router.get('/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid item ID.' } });
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found.' } });
  if (item.deletedAt) return res.status(410).json({ success: false, error: { code: 'IN_TRASH', message: 'Item is in Trash.' } });
  send(res, item);
});

router.post('/', async (req, res) => {
  const { name, type, parentId = null, position = { x: 0, y: 0 }, content, url, metadata, size, appearance } = req.body;
  await ensureFolder(parentId);
  const item = await Item.create({ name, type, parentId, position: { x: Math.max(0, position.x || 0), y: Math.max(0, position.y || 0) }, content, url, metadata, size, appearance });
  send(res, item, 201);
});

router.patch('/:id', async (req, res) => {
  if (!validId(req.params.id)) throw new Error('Invalid item ID');
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found.' } });
  if (item.deletedAt) throw new Error('Item is in Trash');
  itemFields.forEach((field) => { if (req.body[field] !== undefined) item[field] = req.body[field]; });
  await item.save();
  send(res, item);
});

router.patch('/:id/position', async (req, res) => {
  const { x, y } = req.body;
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Position requires finite x and y values');
  const item = await Item.findByIdAndUpdate(req.params.id, { position: { x: Math.max(0, x), y: Math.max(0, y) } }, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found.' } });
  if (item.deletedAt) throw new Error('Item is in Trash');
  send(res, item);
});

router.patch('/:id/move', async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found.' } });
  if (item.deletedAt) throw new Error('Item is in Trash');
  const { parentId = null, position = { x: 0, y: 0 } } = req.body;
  await ensureFolder(parentId);
  if (item.type === 'folder' && await wouldCreateCycle(item, parentId)) throw new Error('Folders cannot be moved into themselves or their descendants');
  item.parentId = parentId;
  item.position = { x: Math.max(0, position.x || 0), y: Math.max(0, position.y || 0) };
  await item.save();
  send(res, item);
});

router.patch('/:id/trash', async (req, res) => {
  if (!validId(req.params.id)) throw new Error('Invalid item ID');
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found.' } });
  if (!item.deletedAt) {
    item.deletedFrom = { parentId: item.parentId, position: { x: item.position.x, y: item.position.y } };
    item.deletedAt = new Date();
    await item.save();
  }
  await DesktopWindow.deleteMany({ itemId: item._id });
  send(res, item);
});

router.patch('/:id/restore', async (req, res) => {
  if (!validId(req.params.id)) throw new Error('Invalid item ID');
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found.' } });
  if (!item.deletedAt) return send(res, item);
  const previousParentId = item.deletedFrom?.parentId || null;
  const parent = previousParentId ? await Item.findById(previousParentId) : null;
  item.parentId = parent && parent.type === 'folder' && !parent.deletedAt ? parent._id : null;
  item.position = { x: Math.max(0, item.deletedFrom?.position?.x ?? 70), y: Math.max(0, item.deletedFrom?.position?.y ?? 70), revision: (item.position?.revision || 0) + 1 };
  item.deletedAt = null;
  item.deletedFrom = undefined;
  await item.save();
  send(res, item);
});

router.delete('/trash', async (_req, res) => {
  const trashed = await Item.find({ deletedAt: { $ne: null } }).select('_id');
  const ids = trashed.map((item) => item._id);
  await Promise.all([Item.deleteMany({ _id: { $in: ids } }), DesktopWindow.deleteMany({ itemId: { $in: ids } })]);
  send(res, { count: ids.length });
});

router.delete('/:id', async (req, res) => {
  const item = await Item.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found.' } });
  await DesktopWindow.deleteMany({ itemId: item._id });
  send(res, { id: item.id });
});
export default router;
