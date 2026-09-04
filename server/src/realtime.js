import mongoose from 'mongoose';
import Item from './models/Item.js';
import DesktopWindow from './models/DesktopWindow.js';
import DesktopSettings from './models/DesktopSettings.js';
import DesktopStroke from './models/DesktopStroke.js';
import DesktopText from './models/DesktopText.js';

const locks = new Map();
const room = 'shared-desktop';
const finitePosition = (position) => position && Number.isFinite(position.x) && Number.isFinite(position.y);
const finiteBounds = (bounds) => bounds && ['x', 'y', 'width', 'height'].every((key) => Number.isFinite(bounds[key])) && bounds.width >= 240 && bounds.height >= 160;
const validColor = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const validStroke = (stroke) => stroke && Array.isArray(stroke.points) && stroke.points.length >= 2 && stroke.points.length <= 4000
  && stroke.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= 1440 && point.y >= 0 && point.y <= 900)
  && validColor(stroke.color) && Number.isFinite(stroke.width) && stroke.width >= 1 && stroke.width <= 32;
const validText = (text) => text && typeof text.text === 'string' && text.text.trim().length <= 1000 && text.text.trim().length > 0
  && Number.isFinite(text.x) && text.x >= 0 && text.x <= 1440 && Number.isFinite(text.y) && text.y >= 0 && text.y <= 900
  && validColor(text.color) && Number.isFinite(text.size) && text.size >= 12 && text.size <= 64;

async function ensureFolder(parentId) {
  if (parentId == null) return null;
  if (!mongoose.isValidObjectId(parentId)) throw new Error('Invalid destination folder');
  const folder = await Item.findById(parentId);
  if (!folder || folder.deletedAt || folder.type !== 'folder') throw new Error('Destination must be a folder');
  return folder;
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

export function setupRealtime(io) {
  const release = (key, socket) => { if (locks.get(key)?.socketId === socket.id) { locks.delete(key); io.to(room).emit('item:unlock', { key }); } };
  io.on('connection', (socket) => {
    socket.on('desktop:join', async () => {
      socket.join(room);
      const [items, windows, strokes, texts, settings] = await Promise.all([
        Item.find({ parentId: null, deletedAt: null }).sort({ updatedAt: -1 }),
        DesktopWindow.find().sort({ z: 1 }),
        DesktopStroke.find({ desktopKey: 'shared-desktop' }).sort({ createdAt: 1 }).limit(2000),
        DesktopText.find({ desktopKey: 'shared-desktop' }).sort({ createdAt: 1 }).limit(500),
        DesktopSettings.findOne({ key: 'shared-desktop' })
      ]);
      socket.emit('desktop:snapshot', { items, windows, strokes, texts, settings });
      socket.to(room).emit('presence:changed', { id: socket.id, online: true });
    });
    socket.on('item:lock', ({ id }, ack = () => {}) => {
      const key = `item:${id}`; const current = locks.get(key);
      if (current && current.socketId !== socket.id) return ack({ ok: false, owner: current.socketId });
      const expiresAt = Date.now() + 15000; locks.set(key, { socketId: socket.id, expiresAt }); setTimeout(() => { if (locks.get(key)?.expiresAt === expiresAt) { locks.delete(key); io.to(room).emit('item:unlock', { key }); } }, 15000); ack({ ok: true });
    });
    socket.on('item:preview', ({ id, position }) => { if (locks.get(`item:${id}`)?.socketId === socket.id && finitePosition(position)) socket.to(room).emit('item:preview', { id, position, owner: socket.id }); });
    socket.on('item:commit', async ({ id, parentId = null, position, revision }, ack = () => {}) => {
      if (!finitePosition(position)) return ack({ ok: false, message: 'Invalid position' });
      try {
        const item = await Item.findById(id); if (!item) return ack({ ok: false, message: 'Item not found' }); if (item.deletedAt) return ack({ ok: false, message: 'Item is in Trash' });
        await ensureFolder(parentId);
        if (item.type === 'folder' && await wouldCreateCycle(item, parentId)) return ack({ ok: false, message: 'A folder cannot contain itself' });
        if ((item.position.revision || 0) !== revision) return ack({ ok: false, stale: true, item });
        item.parentId = parentId;
        item.position = { x: Math.max(0, position.x), y: Math.max(0, position.y), revision: revision + 1 };
        await item.save();
        release(`item:${id}`, socket);
        io.to(room).emit('item:updated', item);
        ack({ ok: true, item });
      } catch (error) {
        release(`item:${id}`, socket);
        ack({ ok: false, message: error.message || 'Move failed' });
      }
    });
    socket.on('ink:preview', (stroke) => {
      if (validStroke(stroke)) socket.to(room).emit('ink:preview', { ...stroke, owner: socket.id });
    });
    socket.on('ink:end', () => socket.to(room).emit('ink:end', { owner: socket.id }));
    socket.on('ink:commit', async (stroke, ack = () => {}) => {
      if (!validStroke(stroke)) return ack({ ok: false, message: 'Invalid stroke' });
      try {
        const saved = await DesktopStroke.create({ ...stroke, desktopKey: 'shared-desktop', createdBy: socket.id });
        socket.to(room).emit('ink:created', saved);
        socket.to(room).emit('ink:end', { owner: socket.id });
        ack({ ok: true, stroke: saved });
      } catch (error) {
        ack({ ok: false, message: error.message || 'Stroke could not be saved' });
      }
    });
    socket.on('ink:erase', async ({ ids }, ack = () => {}) => {
      const safeIds = Array.isArray(ids) ? ids.filter((id) => mongoose.isValidObjectId(id)).slice(0, 100) : [];
      if (!safeIds.length) return ack({ ok: false, message: 'No strokes selected' });
      await DesktopStroke.deleteMany({ _id: { $in: safeIds }, desktopKey: 'shared-desktop' });
      io.to(room).emit('ink:deleted', { ids: safeIds });
      ack({ ok: true });
    });
    socket.on('ink:clear', async (_payload, ack = () => {}) => {
      await DesktopStroke.deleteMany({ desktopKey: 'shared-desktop' });
      io.to(room).emit('ink:cleared');
      ack({ ok: true });
    });
    socket.on('text:commit', async (annotation, ack = () => {}) => {
      if (!validText(annotation)) return ack({ ok: false, message: 'Invalid desktop text' });
      try {
        const saved = await DesktopText.create({ ...annotation, text: annotation.text.trim(), desktopKey: 'shared-desktop', createdBy: socket.id });
        io.to(room).emit('text:created', saved);
        ack({ ok: true, text: saved });
      } catch (error) {
        ack({ ok: false, message: error.message || 'Text could not be saved' });
      }
    });
    socket.on('text:update', async (annotation, ack = () => {}) => {
      if (!mongoose.isValidObjectId(annotation?._id) || !validText(annotation)) return ack({ ok: false, message: 'Invalid desktop text' });
      try {
        const saved = await DesktopText.findOneAndUpdate({ _id: annotation._id, desktopKey: 'shared-desktop' }, { text: annotation.text.trim(), x: annotation.x, y: annotation.y, color: annotation.color, size: annotation.size }, { new: true });
        if (!saved) return ack({ ok: false, message: 'Text not found' });
        io.to(room).emit('text:updated', saved);
        ack({ ok: true, text: saved });
      } catch (error) {
        ack({ ok: false, message: error.message || 'Text could not be updated' });
      }
    });
    socket.on('text:delete', async ({ id }, ack = () => {}) => {
      if (!mongoose.isValidObjectId(id)) return ack({ ok: false, message: 'Invalid text ID' });
      await DesktopText.deleteOne({ _id: id, desktopKey: 'shared-desktop' });
      io.to(room).emit('text:deleted', { id });
      ack({ ok: true });
    });
    socket.on('window:commit', async ({ itemId, patch, revision }, ack = () => {}) => {
      if (patch.bounds && !finiteBounds(patch.bounds)) return ack({ ok: false, message: 'Invalid bounds' });
      let window = await DesktopWindow.findOne({ itemId });
      if (!window) window = new DesktopWindow({ itemId, kind: patch.kind, bounds: patch.bounds || { x: 120, y: 90, width: 620, height: 440 } });
      if (window.revision !== revision && !window.isNew) return ack({ ok: false, stale: true, window });
      Object.assign(window, patch, { revision: (window.revision || 0) + 1 }); await window.save(); io.to(room).emit('window:updated', window); ack({ ok: true, window });
    });
    socket.on('window:preview', ({ itemId, bounds }) => { if (finiteBounds(bounds)) socket.to(room).emit('window:preview', { itemId, bounds }); });
    socket.on('window:close', async ({ itemId }) => { await DesktopWindow.deleteOne({ itemId }); io.to(room).emit('window:deleted', { itemId }); });
    socket.on('desktop:broadcast', (event) => { if (['item:created', 'item:deleted', 'item:updated', 'settings:updated'].includes(event?.type)) socket.to(room).emit(event.type, event.payload); });
    socket.on('disconnect', () => { for (const [key, lock] of locks) if (lock.socketId === socket.id) release(key, socket); socket.to(room).emit('presence:changed', { id: socket.id, online: false }); });
  });
}
