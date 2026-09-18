import { Router } from 'express';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import Message, { messageAnimationTypes, messageIconTypes } from '../models/Message.js';
import MessageAttachmentAsset from '../models/MessageAttachmentAsset.js';
import { requireDesktopSession, requireProfile } from '../middleware/auth.js';
import { normalizeSpotifyAttachment } from '../services/spotifyAttachment.js';
import { normalizeGiphyAttachment } from '../services/giphyAttachment.js';
import { importRemoteMedia, RemoteMediaError } from '../services/remoteMedia.js';

const router = Router();
router.use(requireDesktopSession, requireProfile);
const sendWindow = new Map();
const importWindow = new Map();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const attachmentTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/x-m4a']);

cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });

function uploadAttachment(file) {
  return new Promise<import('cloudinary').UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader.upload_stream({ resource_type: file.mimetype.startsWith('image/') ? 'image' : 'video' }, (error, result) => error ? reject(error) : resolve(result)).end(file.buffer);
  });
}

const attachmentView = (asset) => ({ assetId: String(asset._id), kind: asset.kind, secureUrl: asset.secureUrl, name: asset.name, mimeType: asset.mimeType, bytes: asset.bytes, duration: asset.duration ?? null });

async function normalizeAttachment(value, owner) {
  if (!value) return null;
  const spotifyAttachment = normalizeSpotifyAttachment(value);
  if (spotifyAttachment) return spotifyAttachment;
  const giphyAttachment = normalizeGiphyAttachment(value);
  if (giphyAttachment) return giphyAttachment;
  if (!['image', 'audio'].includes(value.kind) || !mongoose.isValidObjectId(value.assetId)) return undefined;
  const asset = await MessageAttachmentAsset.findOne({ _id: value.assetId, owner, status: 'complete', kind: value.kind }).lean();
  return asset ? attachmentView(asset) : undefined;
}

function checkRate(profile) {
  const now = Date.now();
  const current = (sendWindow.get(profile) || []).filter((time) => now - time < 60_000);
  if (current.length >= 10) return false;
  current.push(now); sendWindow.set(profile, current); return true;
}
function checkImportRate(profile) {
  const now = Date.now();
  const current = (importWindow.get(profile) || []).filter((time) => now - time < 60_000);
  if (current.length >= 5) return false;
  current.push(now); importWindow.set(profile, current); return true;
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

router.post('/attachment', upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file || !attachmentTypes.has(file.mimetype)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Choose a JPG, PNG, WebP, GIF, or audio file under 10 MB.' } });
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) throw new Error('Message attachments are not configured on the server.');
    const result = await uploadAttachment(file);
    const asset = await MessageAttachmentAsset.create({ owner: req.desktop.profile, operationId: crypto.randomUUID(), fingerprint: crypto.createHash('sha256').update(file.buffer).digest('hex'), status: 'complete', kind: file.mimetype.startsWith('image/') ? 'image' : 'audio', secureUrl: result.secure_url, name: file.originalname.slice(0, 180), mimeType: file.mimetype, bytes: result.bytes, duration: result.duration ?? null });
    res.status(201).json({ success: true, data: attachmentView(asset) });
  } catch (error) { next(error); }
});

router.post('/attachment-url', async (req, res, next) => {
  const operationId = typeof req.body?.operationId === 'string' && /^[A-Za-z0-9-]{10,80}$/.test(req.body.operationId) ? req.body.operationId : null;
  const sourceUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (!operationId || !sourceUrl) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A valid HTTPS media URL and operation ID are required.' } });
  const fingerprint = crypto.createHash('sha256').update(sourceUrl).digest('hex');
  const key = { owner: req.desktop.profile, operationId };
  let asset = await MessageAttachmentAsset.findOne(key);
  if (asset) {
    if (asset.fingerprint !== fingerprint) return res.status(409).json({ success: false, error: { code: 'OPERATION_CONFLICT', message: 'This import retry does not match the original URL.' } });
    if (asset.status === 'complete') return res.status(201).json({ success: true, data: attachmentView(asset) });
    return res.status(409).json({ success: false, error: { code: asset.status === 'pending' ? 'IMPORT_PENDING' : asset.errorCode || 'IMPORT_FAILED', message: asset.status === 'pending' ? 'This media import is still running.' : 'This media import did not complete.' } });
  }
  if (!checkImportRate(req.desktop.profile)) return res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Please wait before importing another media link.' } });
  try { asset = await MessageAttachmentAsset.create({ ...key, fingerprint, status: 'pending' }); }
  catch (error) {
    if ((error as { code?: number }).code !== 11000) return next(error);
    asset = await MessageAttachmentAsset.findOne(key);
    if (asset?.fingerprint !== fingerprint) return res.status(409).json({ success: false, error: { code: 'OPERATION_CONFLICT', message: 'This import retry does not match the original URL.' } });
    if (asset?.status === 'complete') return res.status(201).json({ success: true, data: attachmentView(asset) });
    return res.status(409).json({ success: false, error: { code: 'IMPORT_PENDING', message: 'This media import is still running.' } });
  }
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) throw new Error('Message attachments are not configured on the server.');
    const controller = new AbortController();
    req.once('aborted', () => controller.abort());
    const imported = await importRemoteMedia(sourceUrl, controller.signal);
    const uploaded = await uploadAttachment({ buffer: imported.buffer, mimetype: imported.mimeType });
    asset.status = 'complete'; asset.kind = imported.kind; asset.secureUrl = uploaded.secure_url; asset.name = imported.name; asset.mimeType = imported.mimeType; asset.bytes = uploaded.bytes; asset.duration = uploaded.duration ?? null;
    await asset.save();
    return res.status(201).json({ success: true, data: attachmentView(asset) });
  } catch (error) {
    asset.status = 'failed'; asset.errorCode = error instanceof RemoteMediaError ? error.code : 'IMPORT_FAILED'; await asset.save();
    if (error instanceof RemoteMediaError) return res.status(400).json({ success: false, error: { code: error.code, message: error.message } });
    return next(error);
  }
});

router.post('/', async (req, res) => {
  const recipient = String(req.body?.recipient || '').toLowerCase();
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
  const kind = ['alert', 'letter'].includes(req.body?.kind) ? req.body.kind : 'letter';
  const animation = messageAnimationTypes.includes(req.body?.animation) ? req.body.animation : 'hearts';
  const icon = messageIconTypes.includes(req.body?.icon) ? req.body.icon : 'heart';
  const accentColor = typeof req.body?.accentColor === 'string' && /^#[0-9a-f]{6}$/i.test(req.body.accentColor)
    ? req.body.accentColor
    : '#ff8fa5';
  const emoji = typeof req.body?.emoji === 'string' ? req.body.emoji.slice(0, 16) : '💌';
  const attachment = await normalizeAttachment(req.body?.attachment, req.desktop.profile);
  if (!['joe', 'focus'].includes(recipient) || recipient === req.desktop.profile || (!body && !attachment) || attachment === undefined || body.length > 5000 || subject.length > 120) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Message details are invalid.' } });
  const operationId = typeof req.body?.operationId === 'string' && /^[A-Za-z0-9-]{10,80}$/.test(req.body.operationId) ? req.body.operationId : null;
  if (!operationId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A valid operation ID is required.' } });
  const payload = { sender: req.desktop.profile, recipient, kind, subject, body, attachment, icon, accentColor, emoji, animation };
  const operationFingerprint = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const previous = await Message.findOne({ sender: req.desktop.profile, operationId });
  if (previous) {
    if (previous.operationFingerprint !== operationFingerprint) return res.status(409).json({ success: false, error: { code: 'OPERATION_CONFLICT', message: 'This send retry does not match the original message.' } });
    return res.status(201).json({ success: true, data: previous });
  }
  if (!checkRate(req.desktop.profile)) return res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Please wait before sending another message.' } });
  let message;
  try { message = await Message.create({ ...payload, operationId, operationFingerprint }); }
  catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    const replay = await Message.findOne({ sender: req.desktop.profile, operationId });
    if (replay?.operationFingerprint === operationFingerprint) return res.status(201).json({ success: true, data: replay });
    return res.status(409).json({ success: false, error: { code: 'OPERATION_CONFLICT', message: 'This send retry does not match the original message.' } });
  }
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
