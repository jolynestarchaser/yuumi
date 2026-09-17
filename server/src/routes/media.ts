import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import Item from '../models/Item.js';
import { optionalDesktopSession } from '../middleware/auth.js';
import { revisionService, itemSnapshot } from '../services/historyService.js';

const router = Router();
router.use(optionalDesktopSession);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function assertCloudinaryConfigured() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) throw new Error('Image uploads are not configured on the server.');
}

function uploadBuffer(file, resourceType) {
  return new Promise<import('cloudinary').UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ resource_type: resourceType }, (error, result) => error ? reject(error) : resolve(result));
    stream.end(file.buffer);
  });
}
function itemTypeFor(file) {
  if (file.mimetype.startsWith('image/')) return 'image';
  if (file.mimetype.startsWith('video/')) return 'video';
  if (file.mimetype.startsWith('audio/')) return 'audio';
  return 'file';
}
function resourceTypeFor(type) { return type === 'image' ? 'image' : type === 'file' ? 'raw' : 'video'; }
function handleMedia(type, allowed) {
  return asyncRoute(async (req, res) => {
    if (!req.file || !allowed.includes(req.file.mimetype)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `Choose a supported ${type} file.` } });
    assertCloudinaryConfigured();
    const result = await uploadBuffer(req.file, resourceTypeFor(type));
    try {
      const item = await Item.create({
        name: req.body.name || req.file.originalname, type, parentId: req.body.parentId || null,
        position: { x: Math.max(0, Number(req.body.x) || 0), y: Math.max(0, Number(req.body.y) || 0) },
        asset: { publicId: result.public_id, url: result.url, secureUrl: result.secure_url, thumbnailUrl: result.eager?.[0]?.secure_url, originalName: req.file.originalname, extension: req.file.originalname.split('.').pop(), resourceType: resourceTypeFor(type), mimeType: req.file.mimetype, bytes: result.bytes, width: result.width, height: result.height, duration: result.duration },
        updatedBy: req.desktop?.profile || 'unknown'
      });
      await revisionService.record({ entityType: 'item', entityId: item._id, revision: item.contentRevision || 0, operation: 'create', actor: req.desktop?.profile, snapshot: itemSnapshot(item) });
      req.app.get('io')?.to('shared-desktop').emit('item:created', item);
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      try { await cloudinary.uploader.destroy(result.public_id, { resource_type: resourceTypeFor(type) }); } catch { /* Preserve the original database error. */ }
      throw error;
    }
  });
}
router.post('/image', upload.single('file'), handleMedia('image', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']));
router.post('/video', upload.single('file'), handleMedia('video', ['video/mp4', 'video/webm']));
router.post('/file', upload.single('file'), asyncRoute(async (req, res, next) => {
  if (!req.file) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Choose a file to upload.' } });
  const type = itemTypeFor(req.file);
  return handleMedia(type, [req.file.mimetype])(req, res, next);
}));
export default router;
